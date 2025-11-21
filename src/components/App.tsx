// Portions of this file are Copyright 2021 Google LLC, and licensed under GPL2+. See COPYING.

import React, { CSSProperties, useEffect, useState, useMemo } from 'react';
import { MultiLayoutComponentId, State, StatePersister } from '../state/app-state'
import { Model } from '../state/model';
import EditorPanel from './EditorPanel';
import ViewerPanel from './ViewerPanel';
import Footer from './Footer';
import { ModelContext, FSContext } from './contexts';
import PanelSwitcher from './PanelSwitcher';
import { ConfirmDialog } from 'primereact/confirmdialog';
import CustomizerPanel from './CustomizerPanel';
import { LayoutManager } from './LayoutManager';
import { Ribbon } from './Ribbon';

declare var BrowserFS: any;

export function App({ initialState, statePersister, fs }: { initialState: State, statePersister: StatePersister, fs: FS }) {
  const [state, setState] = useState(initialState);

  const model = useMemo(() => new Model(fs, initialState, setState, statePersister), [fs, initialState, statePersister]);
  useEffect(() => model.init(), [model]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F5') {
        event.preventDefault();
        model.render({ isPreview: true, now: true })
      } else if (event.key === 'F6') {
        event.preventDefault();
        model.render({ isPreview: false, now: true })
      } else if (event.key === 'F7') {
        event.preventDefault();
        model.export();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const zIndexOfPanelsDependingOnFocus = {
    editor: {
      editor: 3,
      viewer: 1,
      customizer: 0,
    },
    viewer: {
      editor: 2,
      viewer: 3,
      customizer: 1,
    },
    customizer: {
      editor: 0,
      viewer: 1,
      customizer: 3,
    }
  }

  const layout = state.view.layout
  const mode = state.view.layout.mode;
  function getPanelStyle(id: MultiLayoutComponentId): CSSProperties {
    if (layout.mode === 'multi') {
      const itemCount = (layout.editor ? 1 : 0) + (layout.viewer ? 1 : 0) + (layout.customizer ? 1 : 0)
      return {
        flex: 1,
        maxWidth: Math.floor(100 / itemCount) + '%',
        display: (state.view.layout as any)[id] ? 'flex' : 'none'
      }
    } else {
      return {
        flex: 1,
        zIndex: Number((zIndexOfPanelsDependingOnFocus as any)[id][layout.focus]),
      }
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.items) {
      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        const item = e.dataTransfer.items[i];
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) {
            const buffer = await file.arrayBuffer();
            const Buffer = BrowserFS.BFSRequire('buffer').Buffer;
            const path = `/home/${file.name}`;
            (fs as any).writeFile(path, Buffer.from(buffer), (err: any) => {
              if (err) {
                console.error("Error writing file:", err);
              } else {
                console.log("File written:", path);
                if (path.endsWith('.scad')) {
                  // TODO: Open the file?
                }
              }
            });
          }
        }
      }
    }
  };

  return (
    <ModelContext.Provider value={model}>
      <FSContext.Provider value={fs}>
        <div className='flex flex-column' style={{
          flex: 1,
          height: '100vh',
          overflow: 'hidden'
        }} onDragOver={handleDragOver} onDrop={handleDrop}>

          <Ribbon />
          <div style={{ flex: 1, minHeight: 0, width: '100%' }}>
            <LayoutManager model={model} fs={fs} />
          </div>

          <ConfirmDialog />
        </div>
      </FSContext.Provider>
    </ModelContext.Provider>
  );
}
