# LalIA

LalIA es un IDE local con asistente integrado para trabajar con proyectos de código usando Ollama. La idea es tener una experiencia cómoda tipo VS Code + Codex, pero local, ligera y adaptada a tus proyectos.

## Estado de esta versión

**Versión:** 20.2

Esta versión corrige el error:

```txt
TypeError: history.slice is not a function
```

La causa era que versiones anteriores guardaban el historial como arreglo, pero las versiones nuevas guardan chats por proyecto en un objeto. Ahora LalIA acepta ambos formatos y no debe romperse aunque uses historial viejo o nuevo.

## Qué incluye

- Inicio por defecto cuando no hay archivo abierto.
- Interfaz tipo IDE con barra izquierda:
  - Explorer
  - Search
  - Source Control
  - Run and Debug
  - Extensiones
- Menú superior estilo VS Code, adaptado a LalIA.
- Explorador de archivos y carpetas.
- Editor Monaco.
- Tabs de archivos abiertos.
- Chat lateral con historial por proyecto.
- Historial editable:
  - crear nuevo chat
  - cambiar nombre
  - borrar con confirmación
  - ver chats de otros proyectos
- Botón **Analiza Proyecto**.
- Soporte para pegar o adjuntar hasta 2 imágenes en el chat.
- Preview localhost dentro del IDE.
- Panel inferior dividido:
  - Problemas
  - Terminal / Consola
- Terminal oculta por defecto al abrir.
- Click en CPU/RAM para abrir **Task Manager LalIA**.
- Detección básica de proyecto:
  - Node / Web
  - Flutter
  - Firebase
  - Apps Script
- Instalación/actualización sugerida de modelos Ollama.
- Integración para **Open with LalIA** al compilar/instalar en Windows.

## Requisitos

- Windows 10/11 recomendado.
- Node.js 18 o superior.
- npm.
- Ollama instalado si quieres usar modelos locales.

Modelos sugeridos:

```bash
ollama pull qwen2.5-coder:3b
ollama pull gemma3:1b
```

## Ejecutar en modo desarrollo

```bash
npm install
npm run dev
```

## Compilar instalador

```bash
npm run dist
```

Los archivos se generan en:

```txt
release/
```

## Compilar portable

```bash
npm run dist:portable
```

## Open with LalIA

Para que aparezca **Open with LalIA** en Windows, compila e instala la aplicación:

```bash
npm run dist
```

Después instala el `.exe` generado en `release/`.

Debería aparecer en el menú contextual para:

- archivos
- carpetas
- fondo de carpeta

## Uso básico

1. Abre LalIA.
2. En Inicio, selecciona **Abrir carpeta**.
3. Abre archivos desde Explorer.
4. Escribe instrucciones en el chat.
5. Usa **Ctrl+U** para mandar contexto al chat.
6. Usa **F5** para correr `npm run dev`.
7. Usa el preview para abrir `localhost:5173`, `localhost:3000` o el puerto que necesites.
8. Haz clic en CPU/RAM para abrir el Task Manager interno.

## Atajos principales

| Atajo | Acción |
|---|---|
| Ctrl+Shift+P | Command Palette |
| Ctrl+U | Agregar selección/contexto al chat |
| Ctrl+S | Guardar archivo |
| F5 | Ejecutar `npm run dev` |
| Ctrl+Ñ | Mostrar/ocultar terminal |

## Historial de chats

LalIA guarda chats por proyecto/carpeta. También puede mostrar chats de otros proyectos para que no se pierdan cuando cambias carpetas.

Puedes:

- renombrar chats
- borrar chats con confirmación
- abrir chats de otro proyecto en la misma ventana
- abrirlos en otra ventana cuando corresponda

## Preview localhost

Desde Inicio o la pestaña Preview puedes abrir:

```txt
http://localhost:5173
http://localhost:3000
http://localhost:8080
```

También puedes escribir cualquier URL local.

## Problemas conocidos

- El preview localhost depende de que tu servidor esté corriendo.
- La terminal usa el shell disponible en Windows.
- Algunas funciones de Git/Source Control son base inicial y se pueden mejorar en siguientes versiones.
- El instalador es necesario para registrar correctamente **Open with LalIA**.

## Siguientes mejoras recomendadas

- Source Control más completo.
- Búsqueda real en todo el proyecto.
- Extensiones internas más potentes.
- Aplicar cambios con diff antes de sobrescribir.
- Más controles del Task Manager.
- Mejor manejo de sesiones y ventanas múltiples.

## Marca

LalIA es un proyecto de Medios con Valor.

Página: https://mediosconvalor.com
