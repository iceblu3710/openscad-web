import React, { useState } from 'react';
import { useLayout } from './LayoutContext';

export const Ribbon: React.FC = () => {
    const { changeView, resetLayout, updateComponentState, triggerAction } = useLayout();
    const [activeTab, setActiveTab] = useState<'File' | 'View'>('File');

    return (
        <div id="ribbon-container">
            <div className="ribbon-tabs">
                <div
                    className={`ribbon-tab ${activeTab === 'File' ? 'active' : ''}`}
                    onClick={() => setActiveTab('File')}
                >
                    File
                </div>
                <div
                    className={`ribbon-tab ${activeTab === 'View' ? 'active' : ''}`}
                    onClick={() => setActiveTab('View')}
                >
                    View
                </div>
            </div>

            <div className="ribbon-content">
                {activeTab === 'File' && (
                    <>
                        <div className="ribbon-group">
                            <button className="ribbon-btn">
                                <span className="ribbon-btn-icon">📄</span>
                                New
                            </button>
                            <button className="ribbon-btn">
                                <span className="ribbon-btn-icon">📂</span>
                                Open
                            </button>
                        </div>
                        <div className="separator"></div>
                        <div className="ribbon-group">
                            <button className="ribbon-btn">
                                <span className="ribbon-btn-icon">💾</span>
                                Save
                            </button>
                            <button className="ribbon-btn">
                                <span className="ribbon-btn-icon">📑</span>
                                Save As
                            </button>
                        </div>
                        <div className="separator"></div>
                        <div className="ribbon-group">
                            <button className="ribbon-btn">
                                <span className="ribbon-btn-icon">📤</span>
                                Export
                            </button>
                        </div>
                    </>
                )}

                {activeTab === 'View' && (
                    <>
                        <div className="ribbon-group">
                            <button className="ribbon-btn" onClick={() => changeView('Free')}>Free Cam</button>
                            <button className="ribbon-btn" onClick={() => changeView('Front')}>Front</button>
                            <button className="ribbon-btn" onClick={() => changeView('Back')}>Back</button>
                            <button className="ribbon-btn" onClick={() => changeView('Left')}>Left</button>
                            <button className="ribbon-btn" onClick={() => changeView('Right')}>Right</button>
                            <button className="ribbon-btn" onClick={() => changeView('Top')}>Top</button>
                            <button className="ribbon-btn" onClick={() => changeView('Bottom')}>Bottom</button>
                        </div>
                        <div className="separator"></div>
                        <div className="ribbon-group">
                            <button className="ribbon-btn" onClick={() => updateComponentState({ cameraType: 'Orthographic' })}>Orthogonal</button>
                            <button className="ribbon-btn" onClick={() => updateComponentState({ cameraType: 'Perspective' })}>Projection</button>
                        </div>
                        <div className="separator"></div>
                        <div className="ribbon-group">
                            <button className="ribbon-btn" onClick={() => triggerAction('toggleGrid')}>Grid</button>
                            <button className="ribbon-btn" onClick={() => triggerAction('toggleAxes')}>Axis</button>
                            <button className="ribbon-btn" onClick={() => triggerAction('fitToView')}>Fit to View</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
