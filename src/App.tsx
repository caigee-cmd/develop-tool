import { useEffect, useMemo, useState } from "react";
import { Tabs, Dropdown, Input, App as AntdApp, Button, Tooltip, Modal, Checkbox } from 'antd';
import { listen } from '@tauri-apps/api/event';
import { writeFile as writeFsFile } from '@tauri-apps/plugin-fs';
import { save } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
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
  filePath?: string;
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
    // update native menu enabled state
    const hasActive = Boolean(activeId);
    invoke('set_menu_enabled', { saveEnabled: hasActive, saveAsEnabled: hasActive });
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

  async function promptForName(defaultName: string): Promise<string | null> {
    return new Promise((resolve) => {
      let value = defaultName;
      const instance = modal.confirm({
        title: '命名文件',
        content: (
          <Input
            autoFocus
            defaultValue={defaultName}
            onChange={(e) => { value = e.target.value; }}
            onPressEnter={() => { resolve((value || '').trim()); instance.destroy(); }}
            placeholder="请输入文件名（不含扩展名）"
          />
        ),
        okText: '确定',
        cancelText: '取消',
        onOk: () => resolve((value || '').trim()),
        onCancel: () => resolve(null),
        afterClose: () => {},
      });
    });
  }

  function ensureJsonString(c: Content): string | null {
    if ('text' in c && typeof c.text === 'string') {
      try { JSON.parse(c.text); } catch { message.error('无效的JSON格式'); return null; }
      return c.text;
    }
    if ('json' in c) {
      try { return JSON.stringify(c.json, null, 2); } catch { message.error('无法序列化JSON'); return null; }
    }
    message.error('没有可保存的内容');
    return null;
  }

  async function saveTab(tabId: string, opts?: { saveAs?: boolean }) {
    const t = tabs.find(x => x.id === tabId);
    if (!t) return;
    const data = ensureJsonString(t.content);
    if (data == null) return;

    let path = (!opts?.saveAs && t.filePath) ? t.filePath : undefined;
    let title = t.title;

    if (!path) {
      let baseName = title.startsWith('Untitled') ? '' : title;
      if (!baseName) {
        const named = await promptForName('');
        if (!named) return; // canceled
        baseName = named; // 仅用于默认文件名，不修改标签标题
      }
      const fileName = baseName.toLowerCase().endsWith('.json') ? baseName : `${baseName}.json`;
      if (opts?.saveAs) {
        path = await save({
          defaultPath: fileName,
          filters: [{ name: 'JSON', extensions: ['json'] }],
        }) as string | undefined;
        if (!path) return; // canceled
      } else {
        // Save: 写入 AppCacheDir 下的固定文件名
        const savedPath = await invoke<string>('save_to_cache', { tabId: t.id, content: data });
        setTabs(prev => prev.map(x => x.id === t.id ? { ...x, filePath: savedPath, dirty: false } : x));
        message.success('已保存到缓存');
        return;
      }
    }

    try {
      await invoke('save_to_path', { path, content: data });
      setTabs(prev => prev.map(x => x.id === t.id ? { ...x, filePath: path!, dirty: false } : x));
      message.success('保存成功');
    } catch (e: any) {
      message.error(`保存失败: ${e?.message || e}`);
    }
  }

  async function saveCurrentTab() {
    if (!activeId) return;
    await saveTab(activeId);
  }

  async function saveAsCurrentTab() {
    if (!activeId) return;
    await saveTab(activeId, { saveAs: true });
  }

  // shortcuts: Cmd/Ctrl+S save, Shift+Cmd/Ctrl+S save as
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMeta = navigator.platform.toLowerCase().includes('mac') ? e.metaKey : e.ctrlKey;
      if (isMeta && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (e.shiftKey) saveAsCurrentTab(); else saveCurrentTab();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeId, tabs]);

  // listen to native menu events
  useEffect(() => {
    let unsubs: Array<() => void> = [];
    (async () => {
      unsubs.push(await listen('menu:save', () => { saveCurrentTab(); }));
      unsubs.push(await listen('menu:save-as', () => { saveAsCurrentTab(); }));
      unsubs.push(await listen('tools:extract', () => { openExtractModal(); }));
      unsubs.push(await listen('tools:json-to-excel', () => { runJsonToExcel(); }));
    })();
    return () => { unsubs.forEach((u) => { try { u(); } catch {} }); };
  }, [activeId, tabs]);

  // extract modal state
  const [extractOpen, setExtractOpen] = useState(false);
  const [extractFlatten, setExtractFlatten] = useState(true);
  const [extractFields, setExtractFields] = useState<string[] | null>(null);

  function openExtractModal() {
    // default: select all top-level keys from first item if array
    const base = activeTab?.content;
    let keys: string[] = [];
    if (base && 'text' in base && base.text) {
      try {
        const parsed = JSON.parse(base.text);
        if (Array.isArray(parsed) && parsed.length && typeof parsed[0] === 'object') {
          keys = Object.keys(parsed[0] || {});
        }
      } catch {}
    } else if (base && 'json' in base) {
      const parsed = base.json as any;
      if (Array.isArray(parsed) && parsed.length && typeof parsed[0] === 'object') {
        keys = Object.keys(parsed[0] || {});
      }
    }
    setExtractFields(keys);
    setExtractFlatten(true);
    setExtractOpen(true);
  }

  function runExtract() {
    if (!activeTab) return;
    const data = ensureJsonString(activeTab.content);
    if (!data) return;
    try {
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) { message.error('当前内容不是数组，无法抽取'); return; }
      const fields = extractFields ?? [];
      const result = parsed.map((row: any) => {
        const out: any = {};
        fields.forEach((k) => {
          const v = row?.[k];
          if (extractFlatten && v && typeof v === 'object') {
            Object.entries(v).forEach(([sk, sv]) => { out[`${k}.${sk}`] = sv; });
          } else {
            out[k] = v;
          }
        });
        return out;
      });
      const newTab: TabState = {
        id: generateId(),
        title: `Extracted ${tabs.filter(t => t.title.startsWith('Extracted')).length + 1}`,
        content: { json: result },
        readOnly: true,
        dirty: false,
      };
      setTabs(prev => [...prev, newTab]);
      setActiveId(newTab.id);
      setExtractOpen(false);
    } catch (e: any) {
      message.error(`抽取失败: ${e?.message || e}`);
    }
  }

  async function runJsonToExcel() {
    if (!activeTab) return;
    const data = ensureJsonString(activeTab.content);
    if (!data) return;
    try {
      const path = await save({
        defaultPath: 'data.xlsx',
        filters: [{ name: 'Excel', extensions: ['xlsx'] }],
      }) as string | undefined;
      if (!path) return;
      const bytes = await invoke<number[]>('convert_json_to_excel', { jsonData: data });
      await writeFsFile(path, new Uint8Array(bytes));
      message.success('已导出 Excel');
    } catch (e: any) {
      message.error(`导出失败: ${e?.message || e}`);
    }
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
              onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Escape') setRenamingId(null); }}
              onKeyUp={(e) => { e.stopPropagation(); }}
              onKeyPress={(e) => { e.stopPropagation(); }}
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
          tabBarExtraContent={{
            right: (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Tooltip title="字段提取">
                  <Button type="text" size="small" onClick={openExtractModal}>
                    提取
                  </Button>
                </Tooltip>
                <Tooltip title="JSON 转 Excel">
                  <Button type="text" size="small" onClick={runJsonToExcel}>
                    导出
                  </Button>
                </Tooltip>
              </div>
            )
          }}
            />
          </div>
      <Modal
        title="字段提取"
        open={extractOpen}
        onOk={runExtract}
        onCancel={() => setExtractOpen(false)}
        okText="生成新标签"
        cancelText="取消"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <Checkbox
              checked={extractFlatten}
              onChange={(e) => setExtractFlatten(e.target.checked)}
            >扁平化嵌套对象</Checkbox>
          </div>
          <div>
            <div style={{ marginBottom: 6 }}>选择字段（默认全选）：</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(extractFields || []).map((k) => (
                <Checkbox
                  key={k}
                  checked={(extractFields || []).includes(k)}
                  onChange={(e) => {
                    setExtractFields(prev => {
                      const set = new Set(prev || []);
                      if (e.target.checked) set.add(k); else set.delete(k);
                      return Array.from(set);
                    });
                  }}
                >{k}</Checkbox>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default App;

