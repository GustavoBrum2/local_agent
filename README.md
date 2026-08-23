# PC Match Desktop MVP

Base de migração da extensão PC Match para um aplicativo desktop Tauri 2.

## O que foi reaproveitado da extensão

Copiado praticamente sem alteração:

- `src/domain/` — entidades, tipos e engine de compatibilidade.
- `src/data/` — base inicial de CPU, GPU, placa-mãe, RAM, SSD e HDD.
- `src/types/` — tipos normalizados do catálogo.
- `src/parts-repository.ts` — acesso ao catálogo local.
- `src/services/hardware-match-service.ts` — matching entre hardware detectado e catálogo.
- `src/adapters/hardware-detector/native-to-detected.ts` — conversão da resposta WMI/CIM.
- `src/adapters/hardware-detector/hardware-to-build.ts` — conversão do hardware detectado para `Build`.

Adaptado:

- Chrome Native Messaging -> comando Tauri `detect_hardware`.
- Native Host PowerShell -> `src-tauri/resources/collect-hardware.ps1` que escreve JSON no stdout.
- `Build` local -> snapshot da configuração dentro de `LocalDigitalTwin`.
- recomendação local -> versão enxuta sem Ollama para o MVP.
- `chrome.storage.local` -> arquivo JSON no diretório de dados do aplicativo.

Não incluído nesta primeira base:

- API Cloud;
- Digital Twin persistente remoto;
- Dashboard corporativo;
- Knowledge Graph;
- aprendizado coletivo;
- SDK;
- sincronização automática com a extensão contextual.

## Fluxo implementado

```text
Tauri/React
   -> comando Rust
   -> PowerShell + CIM/WMI
   -> NativeHardwareData
   -> DetectedHardware
   -> hardwareToBuild()
   -> LocalDigitalTwin
   -> arquivo local
   -> engine de compatibilidade
   -> recomendações
```

## Pré-requisitos no Windows

- Node.js 20+;
- Rust toolchain;
- pré-requisitos do Tauri 2 para Windows (WebView2 e ferramentas de build C++);
- PowerShell disponível no sistema.

Consulte a documentação oficial do Tauri para os pré-requisitos atuais antes da primeira compilação.

## Executar

```bash
npm install
npm run tauri:dev
```

## Gerar instalador

```bash
npm run tauri:build
```

## Próximo refactor recomendado

O arquivo `hardware-to-build.ts` foi preservado da extensão para maximizar reaproveitamento. Ele ainda contém alguns fallbacks heurísticos usados no protótipo (por exemplo, inferências de DDR e valores padrão quando uma placa-mãe não é encontrada). Antes de considerar o resultado como compatibilidade de produção, substitua esses defaults por `unknown`/dados ausentes e propague nível de confiança.

Também vale substituir, numa segunda etapa, o pareamento de discos por índice em `native-to-detected.ts` por uma correlação baseada em identificadores/serial/modelo.
