/** @jsx h */
import { h } from 'preact';
import { 
  Tabs, 
  TabsOption
} from '@create-figma-plugin/ui';

export type TabValue = 'linter' | 'settings';

const tabs: Array<TabsOption> = [
  { 
    children: 'Linter',
    value: 'linter' 
  },
  { 
    children: 'Settings',
    value: 'settings' 
  }
];

interface TabBarProps {
  value: TabValue;
  onChange: (value: TabValue) => void;
}

export function TabBar({ value, onChange }: TabBarProps) {
  return (
    <div style={{ textTransform: 'capitalize' }}>
      <Tabs
        options={tabs}
        value={value}
        onValueChange={(newValue) => onChange(newValue as TabValue)}
      />
    </div>
  );
} 