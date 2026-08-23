# Mapa de conversão extensão -> Desktop MVP

| Extensão atual | Desktop MVP | Estratégia |
|---|---|---|
| `domain/` | `src/domain/` | Reutilizado |
| `src/data/` | `src/data/` | Reutilizado |
| `src/parts-repository.ts` | mesmo papel | Reutilizado |
| `hardware-match-service.ts` | mesmo papel | Reutilizado |
| `native-host/local-agent-host.ps1` | `src-tauri/resources/collect-hardware.ps1` | Adaptado |
| `chrome.runtime.sendNativeMessage` | `invoke('detect_hardware')` | Substituído |
| `native-to-detected.ts` | mesmo papel | Reutilizado |
| `hardware-to-build.ts` | mesmo papel no primeiro MVP | Reutilizado |
| `Build` | `HardwareSnapshot.build` | Reaproveitado como snapshot |
| `chrome.storage.local` | `digital-twin.json` no AppData | Substituído |
| `LocalHardwareRecommendationService` | `MvpRecommendationService` | Simplificado, sem Ollama |
| Popup da extensão | `src/App.tsx` | Nova UI desktop |
| Content script de lojas | permanece na extensão | Fora do executável desktop |

## Ponto de corte do MVP

O MVP termina quando o fluxo abaixo funcionar de ponta a ponta em uma máquina Windows:

1. abrir o aplicativo;
2. autorizar/iniciar a análise;
3. coletar hardware via CIM/WMI;
4. normalizar e associar componentes à base existente;
5. criar/atualizar o Digital Twin local;
6. exibir a configuração;
7. executar a engine existente;
8. sugerir RAM/SSD/GPU compatíveis.
