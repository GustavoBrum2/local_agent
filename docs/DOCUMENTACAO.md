# Documentação do Local Chat Desktop

Aplicativo desktop para Windows que detecta o hardware da máquina, normaliza os dados brutos do sistema operacional, associa os componentes a um catálogo local e grava um Digital Twin. Com essa configuração, uma engine de regras avalia compatibilidade e sugere upgrades (RAM, SSD e GPU no MVP).

O núcleo de domínio — entidades, catálogo e regras — veio da extensão PC Match. Neste executável, a coleta não usa mais Chrome Native Messaging: um comando Tauri dispara um script PowerShell e devolve JSON.

---

## 1. Stack e frameworks

### Interface

| Tecnologia | Papel no projeto |
|---|---|
| **React 19** | Interface (`src/App.tsx`, resumo de hardware e painel de recomendações). |
| **Vite 7** | Bundler e servidor de desenvolvimento na porta **1420**. |
| **TypeScript 5** | Tipagem do frontend, dos adaptadores e do domínio. |
| **Zustand 5** | Estado da tela: twin, detecção, erros e recomendações (`src/stores/desktop-store.ts`). |
| **Zod 4** | Biblioteca de validação de schemas no frontend. |
| **@tauri-apps/api** | Ponte JavaScript → Rust (`invoke` dos comandos nativos). |

O Vite ignora `src-tauri/**` no watcher. Sem isso, no Windows — sobretudo em pastas do OneDrive — o Cargo trava `.exe` e o processo cai com `EBUSY`.

### Camada nativa

| Tecnologia | Papel no projeto |
|---|---|
| **Tauri 2** | Empacota a UI numa janela desktop (WebView2) e expõe comandos Rust. |
| **Rust / Cargo** | Backend em `src-tauri/` (detecção e persistência). |
| **serde / serde_json** | JSON entre PowerShell, Rust e TypeScript. |
| **PowerShell + CIM/WMI** | Inventário real da máquina (`src-tauri/resources/collect-hardware.ps1`). |
| **WebView2** | Runtime visual exigido pelo Tauri no Windows. |

Comandos em `src-tauri/src/lib.rs`:

- `detect_hardware` — executa o coletor e devolve JSON.
- `save_digital_twin` / `load_digital_twin` / `delete_digital_twin` — persistem `digital-twin.json` no diretório de dados do app.

A detecção nativa deste MVP existe **somente no Windows**. Em outro sistema o comando retorna erro explícito.

### Organização

```text
src/
  adapters/hardware-detector/   coleta Tauri + normalização
  domain/                       entidades e regras de compatibilidade
  data/                         catálogo local (JSON)
  services/                     matching e recomendações
  digital-twin/                 snapshot e persistência
  stores/                       estado da UI (Zustand)
src-tauri/
  src/lib.rs                    comandos Rust
  resources/collect-hardware.ps1
```

---

## 2. Fluxo ponta a ponta

```text
UI (React / Zustand)
    │  invoke('detect_hardware')
    ▼
Rust (Tauri)
    │  powershell.exe → collect-hardware.ps1
    ▼
JSON bruto CIM/WMI                 NativeHardwareData
    │  nativeDataToDetected()
    ▼
Modelo detectado                   DetectedHardware
    │  hardwareToBuild()
    │  + HardwareMatchService
    ▼
Build de domínio                   CPU, GPU, placa-mãe, RAM, storage
    │  createOrUpdateDigitalTwin()
    ▼
Arquivo local                      digital-twin.json
    │  analyzeCompatibility()
    ▼
Recomendações MVP                  RAM / SSD / GPU
```

A normalização ocorre em **duas etapas**:

1. **Limpeza do WMI** — nomes, unidades, fabricante da GPU, interface e mídia.
2. **Projeção para o domínio** — tentar achar a peça no catálogo; se não achar, montar um componente sintético com heurísticas.

---

## 3. Etapa 0 — Coleta bruta (PowerShell)

`src-tauri/resources/collect-hardware.ps1` consulta o Windows e imprime JSON no stdout. Não há protocolo length-prefixed: o contrato com o Tauri é só JSON.

| Origem | Campo JSON | Conteúdo |
|---|---|---|
| `Win32_Processor` | `cpu` | Nome, fabricante, núcleos e threads. |
| `Win32_ComputerSystem` | `system` | Fabricante e modelo do equipamento. |
| `Win32_BaseBoard` | `motherboard` | Fabricante, produto e serial da placa. |
| `Win32_VideoController` | `gpus` | Nome, PNP ID e versão do driver. |
| `Win32_DiskDrive` | `disks` | Modelo, interface, mídia, tamanho. |
| `Get-PhysicalDisk` | `physicalDisks` | Nome amigável, modelo e tamanho. |
| `Win32_PhysicalMemory` | `ramSticks` | Fabricante, part number, capacidade e velocidade. |

Na coleta de GPU, adaptadores virtuais/remotos são filtrados por nome (`MS Idd`, `Remote Desktop`, `Parsec`, `TeamViewer`, `VNC`, etc.). Se o filtro esvaziar a lista, o script devolve todos os adaptadores para não perder a máquina.

O Rust **não interpreta** o inventário: só confere se a saída é JSON válido.

---

## 4. Etapa 1 — De WMI para `DetectedHardware`

Arquivo: `src/adapters/hardware-detector/native-to-detected.ts`  
Função: `nativeDataToDetected()`

Esta etapa gera um modelo interno estável. Dados do coletor nativo saem com `source: 'native'` e `confidence: 'high'`. Aqui, “high” significa **origem nativa**, não “casou com o catálogo”.

### CPU

- `Name` → `modelName` (com `trim`).
- `Manufacturer` → fabricante.
- `NumberOfCores` / `NumberOfLogicalProcessors` → núcleos e threads.
- Se o nome contém `64`, a arquitetura vira `x86_64`; senão `x86`.

### GPU

- Remove adaptadores virtuais por substring (`ms idd`, `rdp`, `vnc`, `parsec`, `microsoft basic display`, etc.).
- O fabricante sai do **nome + PNPDeviceID**:
  - NVIDIA → `nvidia` ou `VEN_10DE`
  - AMD → `amd` / `ati` / `VEN_1002`
  - Intel → `intel` / `VEN_8086`
- A lista é ordenada por `sortGpusByPriority`: placa discreta (RTX, GTX, RX, Arc) vem antes da gráfica integrada.

### RAM

- Cada pente gera um stick: fabricante, part number, slot e velocidade.
- Capacidade WMI vem em **bytes** e vira GB: `round(Capacity / 1024³)`.
- `totalGb` é a soma; `modules` é a quantidade de pentes.

### Armazenamento

Duas fontes, porque o Windows descreve disco de jeitos diferentes:

1. Preferência por `Get-PhysicalDisk` (nomes mais limpos).
2. Enriquecimento com `Win32_DiskDrive` para interface e mídia.

O pareamento entre as duas listas é **por índice**. Sem `physicalDisks`, o fallback usa só `Win32_DiskDrive`.

Interface:

| Valor bruto | Normalizado |
|---|---|
| contém `nvme` | `NVMe` |
| `scsi` ou `raid` | `NVMe` (NVMe no Windows costuma aparecer como SCSI) |
| `sata` ou `ide` | `SATA` |
| `usb` | `USB` |

Mídia:

| Valor bruto | Normalizado |
|---|---|
| `ssd` / `solid` | `SSD` |
| `hdd` / `hard` | `HDD` |
| `Fixed hard disk media` | `HDD` |

### Placa-mãe e sistema

- Placa: `Manufacturer` + `Product`.
- Sistema: `Manufacturer` + `Model` (depois vira o nome de exibição do Digital Twin).

---

## 5. Etapa 2 — De `DetectedHardware` para `Build`

Arquivo: `src/adapters/hardware-detector/hardware-to-build.ts`  
Função: `hardwareToBuild()`

O hardware detectado vira o `Build` que a engine entende. Para cada peça:

1. monta um nome de busca;
2. consulta `HardwareMatchService` no catálogo (`src/data/*.json`, via `PartsRepository`);
3. se houver match, copia a peça do catálogo (tipos já padronizados);
4. se não houver, cria um componente **sintético** com o que foi medido e heurísticas no restante.

### Matching com o catálogo

Arquivo: `src/services/hardware-match-service.ts`

Antes de comparar, `normalize()` faz:

1. minúsculas;
2. NFD e remoção de acentos;
3. remoção de `®`, `™`, `(R)`, `(TM)`;
4. remoção de `processor`, `cpu`, `gpu`, `graphics`;
5. troca de não alfanumérico por espaço;
6. colapso de espaços.

Pontuação:

| Situação | Score |
|---|---|
| Nomes idênticos após normalize | `1.0` |
| Nome do catálogo contém o detectado | `0.95` |
| Nome detectado contém o do catálogo | `0.90` |
| Sobreposição de tokens | comuns / tokens detectados |
| Bônus de modelo (`i5`, `r7`, `rtx 4060`, etc.) | até `+0.20` |
| Bônus se a marca aparece nos tokens | `+0.08` |

Tokens genéricos (`amd`, `intel`, `nvidia`, `geforce`, `radeon`, `graphics`, `processor`, `cpu`, `gpu`) saem da tokenização para o score não inflar só com a marca.

Só entra candidato com score **≥ 0.45**. O maior score vence.

### Heurísticas sem match no catálogo

Servem para o MVP não ficar mudo. **Não** são spec do fabricante.

**RAM pela frequência**

- `≥ 4800 MHz` → DDR5
- `≥ 1600 MHz` → DDR4
- abaixo → DDR3

**CPU pela string do nome:** AMD (Ryzen/Athlon), Intel (Core/Celeron/Pentium), Apple (M1/M2/M3).

**Storage**

- mídia com `hdd`/`hard` → HDD;
- senão → SSD;
- interface `nvme`/`scsi`/`raid` → NVMe, form factor `M.2 2280`;
- demais → SATA 2.5".

**Placa-mãe sem match** recebe defaults: ATX, DDR4, 2 slots, teto 64 GB / 3200 MHz, 4 SATA. São placeholders.

Campos estruturais que a engine precisa (socket, chipset, TDP, VRAM, slots M.2) ficam vazios ou zerados no sintético. A análise tende a dados insuficientes, não a um “compatível” inventado.

Peças que vieram do catálogo ainda passam por normalizadores de domínio (`DDR4`/`DDR5`, geração PCIe, `NVMe`/`SATA`, form factors M.2/ATX) para as regras trabalharem com uniões fechadas.

---

## 6. Digital Twin e recomendações

Com o `Build` pronto (`src/stores/desktop-store.ts`):

1. `createOrUpdateDigitalTwin` grava o snapshot atual (build + hardware detectado).
2. Reanálises empilham o snapshot anterior no histórico.
3. O JSON é salvo via comando Tauri no AppData.

`MvpRecommendationService` então:

1. pega candidatos do catálogo (RAM, SSD ou GPU);
2. chama `analyzeCompatibility(build, part)` em `src/domain/rules/engine.ts`;
3. mantém só resultados compatíveis (com ou sem avisos);
4. ordena por um score simples (status, avisos, capacidade, preferência NVMe).

A engine despacha por categoria: CPU, placa-mãe, RAM, GPU, SSD e HDD. Não há LLM neste MVP.

---

## 7. Limitações da normalização

- Discos físicos e `Win32_DiskDrive` são pareados por **índice**, não por serial/modelo.
- NVMe reportado como SCSI é tratado como NVMe — em RAID isso pode errar.
- Tipo de RAM sem match no catálogo é inferido só pela frequência.
- Placa-mãe sem match ganha defaults ATX/DDR4.
- `confidence: 'high'` = veio do coletor nativo, não = casou com o catálogo.
- O catálogo é JSON estático. Peça fora da base vira componente sintético, incompleto para a engine.

Antes de tratar o resultado como compatibilidade de produção: correlacionar discos por serial/modelo; usar `unknown` no lugar dos defaults; e separar confiança de coleta da confiança de match.
