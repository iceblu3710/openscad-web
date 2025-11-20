- [ ] Install dependencies:
- react, react-dom, typescript
- @fluentui/react
- golden-layout
- @monaco-editor/react
- three
- [ ] Add global CSS reset + base styles

---

## 5.2 GoldenLayout Integration
### Subtasks:
- [ ] Create a GoldenLayout wrapper component
- [ ] Register components:
- editor
- viewport-perspective
- viewport-top
- viewport-right
- viewport-front
- console
- debug
- [ ] Implement a default layout:
- Perspective top-left
- Ortho top-right
- Editor right pane
- Console bottom
- Debug bottom-right
- [ ] Add handling for React portals
- [ ] Add drag/dock interactivity
- [ ] Add layout save/restore (localStorage)

---

## 5.3 Fluent UI Ribbon
### Subtasks:
- [ ] Create Ribbon.tsx
- [ ] Add tabs:
- Home
- View
- Camera
- Geometry
- Tools
- Help
- [ ] Add button groups per tab
- [ ] Add icons
- [ ] Add dropdown controls (snap, grid)
- [ ] Add theming support
- [ ] Connect ribbon commands to callbacks:
- Run
- Rebuild
- View switches
- Camera modes
- Boolean ops (future)

---

## 5.4 Monaco Editor Integration
### Subtasks:
- [ ] Create ScadEditor.tsx
- [ ] Add Monaco editor embedded inside GoldenLayout panel
- [ ] Bind editor resize to GL container
- [ ] Implement custom OpenSCAD language tokens:
- keywords
- functions
- modules
- numbers
- [ ] Add diagnostics channel (errors/warnings)
- [ ] Add “Run” or “Ctrl+Enter” event hook
- [ ] Save/restore editor tabs

---

## 5.5 Viewports (Three.js)
### Subtasks:
- [ ] Create Viewport.tsx component
- [ ] Implement 4 camera types:
- Perspective (free orbit)
- Top
- Right
- Front
- [ ] Add grid helper
- [ ] Add axes helper
- [ ] Add resize listener
- [ ] Bind viewport to WASM mesh output
- [ ] Add mouse controls:
- Orbit
- Pan
- Zoom
- [ ] Shared scene graph across all viewports

---

## 5.6 OpenSCAD WASM Worker Integration
### Subtasks:
- [ ] Add Web Worker file
- [ ] Load OpenSCAD WASM in worker
- [ ] PostMessage API:
- compile(sourceCode)
- getMesh()
- getErrors()
- [ ] Handle messages in React:
- set editor diagnostics
- update Three.js geometry
- log console messages
- [ ] Implement error/warning pipeline
- [ ] Add performance profiling timers

---

## 5.7 Console Panel
### Subtasks:
- [ ] Create ConsolePanel.tsx
- [ ] Add filter tabs:
- All
- Errors
- Warnings
- Log
- [ ] Add auto-scroll
- [ ] Add colored output
- [ ] Bind to WASM worker events

---

## 5.8 Debug Panel
### Subtasks:
- [ ] Create DebugPanel.tsx
- [ ] Add stats:
- FPS
- Triangles
- Vertices
- WASM compile time
- [ ] Integrate with Three.js stats
- [ ] Integrate with WASM timings
- [ ] Add toggles for wireframe bounding boxes

---

## 5.9 Layout Persistence
### Subtasks:
- [ ] Save GoldenLayout JSON on changes
- [ ] Restore GoldenLayout JSON on startup
- [ ] Provide “Reset Layout” option

---

## 5.10 Theming & Polishing
### Subtasks:
- [ ] Dark theme (default)
- [ ] Light theme
- [ ] Ribbon styling
- [ ] Monaco theme align with UI
- [ ] Three.js background style
- [ ] High-DPI scaling
- [ ] Smooth animations

---

## 5.11 Testing & Optimization
### Subtasks:
- [ ] Web Worker compile load testing
- [ ] Stress test docking layout
- [ ] Accessibility testing
- [ ] Performance tests for:
- Mesh size
- FPS at 4 viewports
- [ ] Bug fixes & cleanup

---

# 6. Deliverables

1. Fully functional OpenSCAD web IDE
2. Quadrant multi-viewport rendering
3. Monaco code editor with SCAD syntax
4. Fluent UI Ribbon
5. GoldenLayout dock system
6. OpenSCAD WASM compile pipeline
7. Console + Debug panels
8. Theme support
9. Project documentation

---

# 7. Stretch Goals (Future)

- Parameter UI (auto-generated from code)
- Scene tree viewer
- Material editor
- Animation timelines
- GPU-based CSG preview
- Support for multiple files & modules
- GitHub file integration
- Plugins/extensions API

---

# 8. Appendix

This project is designed to be “OpenSCAD Next Generation” inside the browser, using WASM for powerful geometry and modern web UI for a first-class developer experience.

