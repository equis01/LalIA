# LalIA

LalIA es un IDE local con asistente integrado usando Ollama. Está pensado para trabajar proyectos reales sin depender de un servicio caro tipo Trae/Codex: abrir carpetas, editar archivos, revisar errores, mandar contexto al chat, visualizar localhost y correr comandos desde la misma app.

Sitio: https://www.evazquez.me  
Repositorio: https://github.com/equis01/LalIA

## Qué incluye esta versión

- Interfaz en español.
- Pantalla de Inicio ajustable, para que siempre quepa mejor en la ventana.
- Explorador de archivos estilo VS Code.
- Crear archivos y carpetas.
- Renombrar y eliminar con confirmación.
- Menú contextual en archivos y carpetas.
- Vista previa de localhost como pestaña interna del IDE.
- Panel inferior oculto por defecto.
- Panel inferior con Problemas, Salida y Terminal.
- Atajo `Ctrl + Ñ` para abrir/cerrar el panel inferior.
- Atajo `Ctrl + U` para agregar selección/código al chat.
- Historial de chats por proyecto.
- Cambiar nombre y borrar chats.
- Prompt para instalar/actualizar modelos recomendados de Ollama.
- Task Manager de LalIA al hacer clic en CPU/RAM.
- Soporte para “Open with LalIA” al compilar e instalar.

## Requisitos

- Node.js LTS
- npm
- Ollama instalado
- Windows 10/11 recomendado

## Modelos recomendados de Ollama

LalIA usa por defecto:

```bash
ollama pull qwen2.5-coder:3b
ollama pull gemma3:1b
```

Al abrir LalIA por primera vez, puede preguntarte si quieres instalar/actualizar esos modelos. Si aceptas, ejecutará los `ollama pull` desde la terminal interna.

## Comandos de limpieza y desarrollo

Cuando quieras reinstalar dependencias desde cero:

```cmd
rmdir /s /q node_modules
del package-lock.json
npm install
npm run dev
npm run dist:dir
npm run dist
```

> Nota: el comando correcto para generar carpeta sin instalador es `npm run dist:dir`. Si escribes `npm dist:dir`, npm lo tomará como un comando inválido.

## Desarrollo

```bash
npm install
npm run dev
```

## Build / instalación

Generar build instalable:

```bash
npm run dist
```

Generar carpeta ejecutable sin instalador:

```bash
npm run dist:dir
```

Los archivos salen en `release/`.

## Atajos principales

| Atajo | Acción |
|---|---|
| `Ctrl + Shift + P` | Paleta de comandos |
| `Ctrl + U` | Agregar selección al chat |
| `Ctrl + Ñ` | Abrir/cerrar panel inferior |
| `Ctrl + S` | Guardar archivo |
| `F5` | Ejecutar `npm run dev` |

## Vista previa localhost

La vista previa se abre dentro de LalIA como pestaña. Puedes usar:

- `http://localhost:5173`
- `http://localhost:3000`
- `http://localhost:8080`

## Historial de chats

El historial se guarda por proyecto, pero también puede mostrar chats de otros proyectos. Esto ayuda cuando una carpeta se mueve o cambia de ubicación.

## Roadmap sugerido

- Búsqueda real en proyecto.
- Git visual con cambios, commits y ramas.
- Extensiones internas para Flutter, Firebase y Apps Script.
- Aplicar parches directamente desde respuestas de LalIA.
- Indexado local del proyecto para mejor contexto.
- Tareas guardadas por proyecto (`npm run dev`, `flutter run`, `firebase deploy`, etc.).
- Preview con perfiles móvil/tablet/desktop más completos.
