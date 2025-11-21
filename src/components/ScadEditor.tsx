import React, { useContext, useState, useEffect } from 'react';
import Editor, { loader, Monaco } from '@monaco-editor/react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { InputTextarea } from 'primereact/inputtextarea';
import { ModelContext } from './contexts';
import openscadEditorOptions from '../language/openscad-editor-options';

// Check for Monaco support (same as EditorPanel)
const isMonacoSupported = (() => {
    const ua = window.navigator.userAgent;
    const iosWk = ua.match(/iPad|iPhone/i) && ua.match(/WebKit/i);
    return !iosWk;
})();

let monacoInstance: Monaco | null = null;
if (isMonacoSupported) {
    loader.init().then(mi => monacoInstance = mi);
}

export const ScadEditor: React.FC = () => {
    const model = useContext(ModelContext);
    if (!model) return <div>Error: No Model Context</div>;

    const state = model.state;
    const [editor, setEditor] = useState(null as monaco.editor.IStandaloneCodeEditor | null);

    // Update markers
    if (editor) {
        const checkerRun = state.lastCheckerRun;
        const editorModel = editor.getModel();
        if (editorModel && checkerRun && monacoInstance) {
            monacoInstance.editor.setModelMarkers(editorModel, 'openscad', checkerRun.markers);
        }
    }

    const onMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
        editor.addAction({
            id: "openscad-render",
            label: "Render OpenSCAD",
            run: () => model.render({ isPreview: false, now: true })
        });
        editor.addAction({
            id: "openscad-preview",
            label: "Preview OpenSCAD",
            run: () => model.render({ isPreview: true, now: true })
        });
        editor.addAction({
            id: "openscad-save-do-nothing",
            label: "Save (disabled)",
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
            run: () => { }
        });
        editor.addAction({
            id: "openscad-save-project",
            label: "Save OpenSCAD project",
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyS],
            run: () => model.saveProject()
        });
        setEditor(editor);
    };

    // Handle resizing
    useEffect(() => {
        const handleResize = () => {
            if (editor) {
                editor.layout();
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [editor]);

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
            {isMonacoSupported && (
                <Editor
                    className="openscad-editor"
                    defaultLanguage="openscad"
                    path={state.params.activePath}
                    value={model.source}
                    onChange={s => model.source = s ?? ''}
                    onMount={onMount}
                    options={{
                        ...openscadEditorOptions,
                        fontSize: 16,
                        lineNumbers: state.view.lineNumbers ? 'on' : 'off',
                        automaticLayout: true, // Let Monaco handle resizing
                    }}
                />
            )}
            {!isMonacoSupported && (
                <InputTextarea
                    className="openscad-editor"
                    style={{ width: '100%', height: '100%' }}
                    value={model.source}
                    onChange={s => model.source = s.target.value ?? ''}
                />
            )}
        </div>
    );
};
