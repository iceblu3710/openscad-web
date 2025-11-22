import React, { useEffect, useRef } from 'react';
import { GoldenLayout, LayoutConfig } from 'golden-layout';
import { createRoot } from 'react-dom/client';
import { ScadEditor } from './ScadEditor';
import { Viewport } from './Viewport';
import { ViewportAdder } from './ViewportAdder';
import { Model } from '../state/model';
import { ModelContext, FSContext } from './contexts';
import { useLayout } from './LayoutContext';

interface LayoutManagerProps {
    model: Model;
    fs: FS;
}

export const LayoutManager: React.FC<LayoutManagerProps> = ({ model, fs }) => {
    const layoutRef = useRef<HTMLDivElement>(null);
    const glRef = useRef<GoldenLayout | null>(null);
    const { setActiveComponent, registerResetHandler } = useLayout();

    useEffect(() => {
        if (!layoutRef.current) return;

        const config: LayoutConfig = {
            settings: {
                showPopoutIcon: false,
                showMaximiseIcon: true,
                showCloseIcon: true
            },
            dimensions: {
                borderWidth: 6,
                headerHeight: 28,
                minItemWidth: 200
            },
            root: {
                type: 'row',
                content: [
                    {
                        type: 'stack',
                        width: 30,
                        content: [
                            {
                                type: 'component',
                                componentType: 'scad-editor',
                                title: 'Code Editor',
                                componentState: { label: 'Editor' },
                                isClosable: true,
                            }
                        ]
                    },
                    {
                        type: 'stack',
                        width: 70,
                        content: [
                            {
                                type: 'component',
                                componentType: 'viewport',
                                title: 'Perspective',
                                componentState: { viewType: 'Perspective' },
                                isClosable: true,
                            },
                            {
                                type: 'component',
                                componentType: 'viewport-adder',
                                title: '+',
                                componentState: {},
                                isClosable: false,
                            }
                        ]
                    }
                ]
            }
        };

        let gl: GoldenLayout | null = null;

        const initLayout = () => {
            if (!layoutRef.current) return;
            const { width, height } = layoutRef.current.getBoundingClientRect();

            if (width === 0 || height === 0) {
                return;
            }

            if (glRef.current) {
                glRef.current.setSize(width, height);
                return;
            }

            gl = new GoldenLayout(layoutRef.current);

            // Helper to register components with selection logic
            const registerComponent = (name: string, renderFn: (container: any, state: any) => React.ReactNode) => {
                gl!.registerComponentFactoryFunction(name, (container, state) => {
                    const root = createRoot(container.element);

                    // Render
                    root.render(
                        <ModelContext.Provider value={model}>
                            <FSContext.Provider value={fs}>
                                {renderFn(container, state)}
                            </FSContext.Provider>
                        </ModelContext.Provider>
                    );

                    // Selection Logic
                    container.element.addEventListener('pointerdown', () => {
                        setActiveComponent(container.parent as any);
                    }, { passive: true });

                    container.on('destroy', () => {
                        setTimeout(() => root.unmount(), 0);
                    });
                });
            };

            registerComponent('scad-editor', () => <ScadEditor />);
            registerComponent('viewport', (container) => <Viewport container={container} />);
            registerComponent('viewport-adder', (container) => <ViewportAdder container={container} />);

            gl.loadLayout(config);
            glRef.current = gl;
            gl.setSize(width, height);

            // Patch GroundItem
            const patchGroundItem = () => {
                const groundItem = (gl as any).groundItem;
                if (gl && groundItem) {
                    const originalOnDrop = groundItem.onDrop;
                    groundItem.onDrop = function (contentItem: any, area: any) {
                        if (!area) return;
                        if (!area.side) area.side = 'right';
                        return originalOnDrop.call(this, contentItem, area);
                    };
                }
            };
            patchGroundItem();
        };

        const resizeObserver = new ResizeObserver(() => {
            window.requestAnimationFrame(() => {
                initLayout();
            });
        });

        resizeObserver.observe(layoutRef.current);
        setTimeout(initLayout, 0);

        // Register reset handler
        registerResetHandler(() => {
            if (glRef.current) {
                glRef.current.destroy();
                glRef.current = null;
                // Re-init
                initLayout();
            }
        });

        return () => {
            resizeObserver.disconnect();
            if (glRef.current) {
                glRef.current.destroy();
                glRef.current = null;
            }
        };
    }, [model, fs, setActiveComponent, registerResetHandler]);

    return (
        <div ref={layoutRef} id="layout-container" />
    );
};
