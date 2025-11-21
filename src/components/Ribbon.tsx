import React from 'react';
import { Pivot, PivotItem } from '@fluentui/react/lib/Pivot';
import { CommandBar, ICommandBarItemProps } from '@fluentui/react/lib/CommandBar';

const homeItems: ICommandBarItemProps[] = [
    {
        key: 'newItem',
        text: 'New',
        iconProps: { iconName: 'Add' },
        onClick: () => console.log('New'),
    },
    {
        key: 'openItem',
        text: 'Open',
        iconProps: { iconName: 'OpenFile' },
        onClick: () => console.log('Open'),
    },
    {
        key: 'saveItem',
        text: 'Save',
        iconProps: { iconName: 'Save' },
        onClick: () => console.log('Save'),
    },
    {
        key: 'compileItem',
        text: 'Compile',
        iconProps: { iconName: 'Processing' },
        onClick: () => console.log('Compile'),
    },
];

const viewItems: ICommandBarItemProps[] = [
    {
        key: 'resetView',
        text: 'Reset View',
        iconProps: { iconName: 'Refresh' },
        onClick: () => console.log('Reset View'),
    },
    {
        key: 'toggleAxes',
        text: 'Toggle Axes',
        iconProps: { iconName: 'ToggleRight' },
        onClick: () => console.log('Toggle Axes'),
    },
];

export const Ribbon: React.FC = () => {
    return (
        <div style={{ borderBottom: '1px solid #ccc' }}>
            <Pivot aria-label="Ribbon Tabs">
                <PivotItem headerText="Home">
                    <CommandBar
                        items={homeItems}
                        ariaLabel="Home actions"
                    />
                </PivotItem>
                <PivotItem headerText="View">
                    <CommandBar
                        items={viewItems}
                        ariaLabel="View actions"
                    />
                </PivotItem>
            </Pivot>
        </div>
    );
};
