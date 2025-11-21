import React, { useEffect, useRef } from 'react';
import { GoldenLayout, LayoutConfig } from 'golden-layout';
import { createRoot } from 'react-dom/client';
import 'golden-layout/dist/css/goldenlayout-base.css';
import 'golden-layout/dist/css/themes/goldenlayout-light-theme.css';
import { ScadEditor } from './ScadEditor';
import { Viewport } from './Viewport';
import { Model } from '../state/model';
import { ModelContext, FSContext } from './contexts';

interface LayoutManagerProps {
    model: Model;
    fs: FS;
}

export const LayoutManager: React.FC<LayoutManagerProps> = ({ model, fs }) => {
    const layoutRef = useRef<HTMLDivElement>(null);
    const glRef = useRef<GoldenLayout | null>(null);

    useEffect(() => {
        if (!layoutRef.current) return;

        const config: LayoutConfig = {
            root: {
                type: 'row',
                content: [
                    {
                        type: 'component',
                        componentType: 'scad-editor',
                        title: 'Editor',
                        width: 50
                    },
                    {
                        type: 'component',
                        componentType: 'viewport',
                        title: 'Viewport',
                        width: 50
                    }
                ]
            }
        };

        let gl: GoldenLayout | null = null;

        const initLayout = () => {
            if (!layoutRef.current) return;
            const { width, height } = layoutRef.current.getBoundingClientRect();

            // Don't initialize if dimensions are 0
            if (width === 0 || height === 0) return;

            // If already initialized, just resize
            if (glRef.current) {
                glRef.current.setSize(width, height);
                return;
            }

            gl = new GoldenLayout(layoutRef.current);

            gl.registerComponentFactoryFunction('scad-editor', (container, state) => {
                const root = createRoot(container.element);
                root.render(
                    <ModelContext.Provider value={model}>
                        <FSContext.Provider value={fs}>
                            <ScadEditor />
                        </FSContext.Provider>
                    </ModelContext.Provider>
                );

                container.on('destroy', () => {
                    setTimeout(() => root.unmount(), 0);
                });
            });

            gl.registerComponentFactoryFunction('viewport', (container, state) => {
                const root = createRoot(container.element);
                root.render(
                    <ModelContext.Provider value={model}>
                        <FSContext.Provider value={fs}>
                            <Viewport />
                        </FSContext.Provider>
                    </ModelContext.Provider>
                );

                container.on('destroy', () => {
                    setTimeout(() => root.unmount(), 0);
                });
            });

            gl.loadLayout(config);
            glRef.current = gl;

            console.log(`LayoutManager initialized with dimensions: ${width}x${height}`);
            gl.setSize(width, height);

            // Patch GroundItem.onDrop to prevent crash and debug invalid area
            // We do this after loadLayout to ensure groundItem exists
            const patchGroundItem = () => {
                // Access groundItem via any cast as it might be internal/protected
                const groundItem = (gl as any).groundItem;
                if (gl && groundItem) {
                    console.log('Patching GroundItem.onDrop');
                    const originalOnDrop = groundItem.onDrop;
                    groundItem.onDrop = function (contentItem: any, area: any) {
                        if (!area || !area.side) {
                            console.warn('GroundItem.onDrop called with invalid area:', area);
                            return;
                        }
                        return originalOnDrop.call(this, contentItem, area);
                    };
                } else {
                    console.warn('Failed to patch GroundItem.onDrop: groundItem not found');
                }
            };

            patchGroundItem();
        };

        const resizeObserver = new ResizeObserver((entries) => {
            // Use requestAnimationFrame to avoid "ResizeObserver loop limit exceeded"
            window.requestAnimationFrame(() => {
                if (layoutRef.current) {
                    const { width, height } = layoutRef.current.getBoundingClientRect();
                    console.log(`LayoutManager resizing to: ${width}x${height}`);
                }
                initLayout();
            });
        });

        resizeObserver.observe(layoutRef.current);

        // Initial check
        initLayout();

        return () => {
            resizeObserver.disconnect();
            if (glRef.current) {
                glRef.current.destroy();
                glRef.current = null;
            }
        };
    }, [model, fs]);

    return (
        <div ref={layoutRef} style={{ width: '100%', height: '100%', position: 'relative' }} />
    );
};
