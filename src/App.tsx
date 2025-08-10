import { useEffect, useMemo, useState } from "react";
import { Tabs, Dropdown, Input, App as AntdApp, Button, Tooltip } from 'antd';
import {
  PlusOutlined,
  CloseOutlined,
  CopyOutlined,
  EditOutlined,
  LockOutlined,
  UnlockOutlined,
} from '@ant-design/icons';
import './App.css';
import VanillaJSONEditor from './VanillaJSONEditor';
import { type Content } from 'vanilla-jsoneditor';

type TabState = {
  id: string;
  title: string;
  content: Content;
  readOnly: boolean;
  dirty: boolean;
};

const LOCAL_TABS_KEY = 'json_editor_tabs_v1';
const LOCAL_ACTIVE_KEY = 'json_editor_active_v1';

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyTab(n: number): TabState {
  return {
    id: generateId(),
    title: `Untitled ${n}`,
    content: { text: '' },
    readOnly: false,
    dirty: false,
  };
}

function App() {
  const { message, modal } = AntdApp.useApp();
  const [tabs, setTabs] = useState<TabState[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const maxTabs = 10;

  // init from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_TABS_KEY);
      const rawActive = localStorage.getItem(LOCAL_ACTIVE_KEY);
      if (raw) {
        const parsed: TabState[] = JSON.parse(raw);
        const prepared = parsed.length > 0 ? parsed : [createEmptyTab(1)];
        setTabs(prepared);
        setActiveId(rawActive || prepared[0].id);
      } else {
        const first = createEmptyTab(1);
        setTabs([first]);
        setActiveId(first.id);
      }
    } catch {
      const first = createEmptyTab(1);
      setTabs([first]);
      setActiveId(first.id);
    }
  }, []);

  // persist
  useEffect(() => {
    localStorage.setItem(LOCAL_TABS_KEY, JSON.stringify(tabs));
  }, [tabs]);
  useEffect(() => {
    if (activeId) localStorage.setItem(LOCAL_ACTIVE_KEY, activeId);
  }, [activeId]);

  const canAdd = tabs.length < maxTabs;
  const activeTab = useMemo(() => tabs.find(t => t.id === activeId) || tabs[0], [tabs, activeId]);

  function addTab(copyFromId?: string) {
    if (!canAdd) {
      message.warning(`最多只能打开 ${maxTabs} 个标签`);
      return;
    }
    const index = tabs.filter(t => t.title.startsWith('Untitled')).length + 1;
    const base = copyFromId ? tabs.find(t => t.id === copyFromId) : undefined;
    const newTab: TabState = base
      ? { ...base, id: generateId(), title: `${base.title} (copy)`, dirty: true }
      : createEmptyTab(index);
    setTabs(prev => [...prev, newTab]);
    setActiveId(newTab.id);
  }

  function requestCloseTab(id: string) {
    const t = tabs.find(x => x.id === id);
    if (!t) return;
    const doClose = () => {
      setTabs(prev => prev.filter(x => x.id !== id));
      if (activeId === id) {
        const idx = tabs.findIndex(x => x.id === id);
        const next = tabs[idx + 1] || tabs[idx - 1];
        setActiveId(next ? next.id : '');
      }
    };
    if (t.dirty) {
      modal.confirm({
        title: '未保存的更改',
        content: `关闭 "${t.title}" 将丢失未保存的更改，确定关闭？`,
        okText: '关闭',
        cancelText: '取消',
        onOk: doClose,
      });
    } else {
      doClose();
    }
  }

  function closeOthers(id: string) {
    const othersDirty = tabs.filter(t => t.id !== id && t.dirty).length > 0;
    const doClose = () => {
      setTabs(prev => prev.filter(t => t.id === id));
      setActiveId(id);
    };
    if (othersDirty) {
      modal.confirm({
        title: '未保存的更改',
        content: '关闭其他标签将丢失未保存的更改，确定关闭其他？',
        okText: '关闭其他',
        cancelText: '取消',
        onOk: doClose,
      });
    } else doClose();
  }

  function closeAll() {
    const anyDirty = tabs.some(t => t.dirty);
    const doClose = () => {
      const first = createEmptyTab(1);
      setTabs([first]);
      setActiveId(first.id);
    };
    if (anyDirty) {
      modal.confirm({
        title: '未保存的更改',
        content: '关闭全部将丢失未保存的更改，确定关闭全部？',
        okText: '关闭全部',
        cancelText: '取消',
        onOk: doClose,
      });
    } else doClose();
  }

  function toggleReadOnly(id: string) {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, readOnly: !t.readOnly } : t));
  }

  function renameTab(id: string, title: string) {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, title } : t));
  }

  function onDropTab(targetKey: string) {
    if (!dragKey || dragKey === targetKey) return;
    const from = tabs.findIndex(t => t.id === dragKey);
    const to = tabs.findIndex(t => t.id === targetKey);
    if (from < 0 || to < 0) return;
    const next = tabs.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setTabs(next);
  }

  const menuFor = (tab: TabState) => ({
    items: [
      { key: 'rename', icon: <EditOutlined />, label: '重命名' },
      { key: 'duplicate', icon: <CopyOutlined />, label: '复制' },
      { type: 'divider' as const },
      { key: 'toggle-ro', icon: tab.readOnly ? <UnlockOutlined /> : <LockOutlined />, label: tab.readOnly ? '取消只读' : '设为只读' },
      { type: 'divider' as const },
      { key: 'close', icon: <CloseOutlined />, danger: true, label: '关闭' },
      { key: 'close-others', label: '关闭其他' },
      { key: 'close-all', label: '关闭全部' },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === 'rename') setRenamingId(tab.id);
      else if (key === 'duplicate') addTab(tab.id);
      else if (key === 'toggle-ro') toggleReadOnly(tab.id);
      else if (key === 'close') requestCloseTab(tab.id);
      else if (key === 'close-others') closeOthers(tab.id);
      else if (key === 'close-all') closeAll();
    },
  });

  const items = tabs.map((t) => ({
    key: t.id,
    label: (
      <Dropdown menu={menuFor(t)} trigger={["contextMenu"]}>
        <div
          draggable
          onDragStart={() => setDragKey(t.id)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => onDropTab(t.id)}
          onDoubleClick={() => setRenamingId(t.id)}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          {renamingId === t.id ? (
            <Input
              size="small"
              autoFocus
              defaultValue={t.title}
              onBlur={(e) => { renameTab(t.id, e.target.value || t.title); setRenamingId(null); }}
              onPressEnter={(e) => { const v = (e.target as HTMLInputElement).value; renameTab(t.id, v || t.title); setRenamingId(null); }}
              onKeyDown={(e) => { if (e.key === 'Escape') setRenamingId(null); }}
              style={{ width: 140 }}
            />
          ) : (
            <span title={t.title}>
              {t.title}{t.dirty ? ' *' : ''}
            </span>
          )}
          {t.readOnly && (
            <Tooltip title="只读">
              <LockOutlined style={{ fontSize: 12, color: '#999' }} />
            </Tooltip>
          )}
        </div>
      </Dropdown>
    ),
    closable: true,
    children: (
      <div className="my-editor">
        <VanillaJSONEditor
          content={t.content}
          readOnly={t.readOnly}
          onChange={(next) => setTabs(prev => prev.map(x => x.id === t.id ? { ...x, content: next, dirty: true } : x))}
        />
      </div>
    ),
  }));

  return (
    <div className="App" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div className="tabs-wrap">
        <Tabs
          type="editable-card"
          hideAdd={false}
          addIcon={<PlusOutlined />}
          size="small"
          tabBarGutter={2}
          className="tabs-compact"
          style={{ height: '100%', width: '100%' }}
          activeKey={activeId}
          items={items}
          onChange={(k) => setActiveId(k)}
          destroyInactiveTabPane={false}
          onEdit={(targetKey, action) => {
            if (action === 'add') addTab();
            if (action === 'remove') requestCloseTab(String(targetKey));
          }}
        />
      </div>
    </div>
  );
}

export default App;

