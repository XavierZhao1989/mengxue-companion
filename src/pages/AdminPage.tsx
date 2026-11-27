import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Edit3,
  Plus,
  Search,
  Server,
  Smartphone,
  Trash2,
} from 'lucide-react';
import { LessonEditorDrawer } from '../components/admin/LessonEditorDrawer';
import type { ToastVariant } from '../components/mobile/Toast';
import { useAsyncData } from '../hooks/useAsyncData';
import {
  createLesson,
  deleteLesson,
  fetchBackendHealth,
  fetchDashboard,
  fetchLessons,
  togglePublishLesson,
  updateLesson,
  type BackendHealthInfo,
} from '../services/api';
import {
  CATEGORY_LABELS,
  type Category,
  type PrimerLesson,
} from '../types/domain';

interface AdminPageProps {
  dataVersion: number;
  onExitAdmin: () => void;
  onDataMutated: () => void;
  onShowToast: (msg: string, variant?: ToastVariant) => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({
  dataVersion,
  onExitAdmin,
  onDataMutated,
  onShowToast,
}) => {
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<PrimerLesson | null>(null);
  const [backendHealth, setBackendHealth] = useState<BackendHealthInfo | null>(null);

  useEffect(() => {
    fetchBackendHealth().then(setBackendHealth).catch(() => {});
  }, []);

  const { status, data, retry } = useAsyncData(
    async (signal) => {
      const [lessonsRes, dashRes] = await Promise.all([
        fetchLessons(
          { category, keyword, includeUnpublished: true },
          'normal',
          signal
        ),
        fetchDashboard('normal', signal),
      ]);
      return { lessons: lessonsRes.items, dash: dashRes };
    },
    {
      deps: [category, keyword, dataVersion],
    }
  );

  const lessons = data?.lessons ?? [];
  const publishedCount = lessons.filter((l) => l.published).length;
  const draftCount = lessons.length - publishedCount;
  const totalCheckIns = (data?.dash.allChildren ?? []).reduce(
    (sum, c) => sum + c.checkInDates.length,
    0
  );

  const handleTogglePublish = async (lesson: PrimerLesson) => {
    try {
      await togglePublishLesson(lesson.id);
      onShowToast(
        lesson.published ? `已下架《${lesson.title}》` : `已上架《${lesson.title}》`,
        'success'
      );
      onDataMutated();
    } catch {
      onShowToast('状态更新失败', 'error');
    }
  };

  const handleDelete = async (lesson: PrimerLesson) => {
    try {
      await deleteLesson(lesson.id);
      onShowToast(`已删除《${lesson.title}》`, 'info');
      onDataMutated();
    } catch {
      onShowToast('删除失败', 'error');
    }
  };

  const handleSave = async (
    payload: Omit<PrimerLesson, 'id' | 'updatedAt'>,
    existingId?: string
  ) => {
    if (existingId && editingLesson) {
      await updateLesson({ ...editingLesson, ...payload });
      onShowToast(`已更新《${payload.title}》并实时同步家长端`, 'success');
    } else {
      await createLesson(payload);
      onShowToast(`已创建《${payload.title}》并同步到家长端`, 'success');
    }
    onDataMutated();
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F4F1EB',
        display: 'grid',
        gridTemplateColumns: '220px 1fr',
      }}
    >
      {/* Left Sidebar */}
      <aside
        style={{
          background: '#1E2025',
          color: '#E5E7EB',
          padding: '22px 16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF' }}>
              启蒙小笺 · 运营台
            </div>
            <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
              蒙学内容与硬件联动后台
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                background: 'rgba(200, 90, 50, 0.2)',
                color: '#FDBA9B',
                fontSize: 13,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <BookOpen size={16} />
              <span>蒙学篇目管理</span>
            </div>

            {backendHealth && (
              <div
                style={{
                  marginTop: 8,
                  padding: '8px 10px',
                  borderRadius: 8,
                  background: backendHealth.connected
                    ? 'rgba(47, 125, 99, 0.2)'
                    : 'rgba(255, 255, 255, 0.06)',
                  color: backendHealth.connected ? '#86EFAC' : '#9CA3AF',
                  fontSize: 11,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Server size={13} style={{ flexShrink: 0 }} />
                <span>{backendHealth.label}</span>
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onExitAdmin}
          className="pressable"
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            background: '#2E323B',
            color: '#FFFFFF',
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Smartphone size={16} />
          <span>返回移动端预览</span>
        </button>
      </aside>

      {/* Main Content */}
      <main style={{ padding: '24px 32px', overflowX: 'auto' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h1 className="t-display" style={{ margin: 0 }}>
              蒙学内容管理后台
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
              在此新增、编辑或上下架篇目，切换回家长端手机视图会立即看到实时同步结果。
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingLesson(null);
              setDrawerOpen(true);
            }}
            className="pressable"
            style={{
              height: 42,
              padding: '0 18px',
              borderRadius: 10,
              background: 'var(--brand-primary)',
              color: '#FFFFFF',
              fontSize: 14,
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Plus size={17} />
            <span>新增蒙学篇目</span>
          </button>
        </div>

        {/* KPI Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(150px, 1fr))',
            gap: 14,
            marginBottom: 20,
          }}
        >
          <KpiCard label="已上架篇目" value={String(publishedCount)} accent="var(--brand-jade)" />
          <KpiCard label="未上架草稿" value={String(draftCount)} accent="var(--brand-amber)" />
          <KpiCard label="家庭累计打卡(天)" value={String(totalCheckIns)} accent="var(--brand-primary)" />
          <KpiCard
            label="硬件伴读笔"
            value={data?.dash.device.connected ? '在线' : '离线'}
            accent="var(--text-primary)"
          />
        </div>

        {/* Filter Bar */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 14,
            padding: 16,
            border: '1px solid var(--border-subtle)',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 240px', maxWidth: 360 }}>
            <Search size={16} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索篇名、作者..."
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: 8,
                border: '1px solid var(--border-subtle)',
                fontSize: 13,
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {(['all', 'mengxue', 'poetry', 'shenglv'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className="pressable"
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: category === cat ? 600 : 500,
                  background: category === cat ? 'var(--brand-primary)' : 'var(--bg-canvas)',
                  color: category === cat ? '#FFFFFF' : 'var(--text-secondary)',
                }}
              >
                {cat === 'all' ? '全部分类' : CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 14,
            border: '1px solid var(--border-subtle)',
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-canvas)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                <th style={thStyle}>篇目标题</th>
                <th style={thStyle}>分类</th>
                <th style={thStyle}>适龄</th>
                <th style={thStyle}>句数</th>
                <th style={thStyle}>发布状态</th>
                <th style={thStyle}>操作</th>
              </tr>
            </thead>
            <tbody>
              {status === 'loading' && (
                <tr>
                  <td colSpan={6} style={{ padding: 28, textAlign: 'center', color: 'var(--text-muted)' }}>
                    正在加载篇目列表…
                  </td>
                </tr>
              )}
              {status === 'error' && (
                <tr>
                  <td colSpan={6} style={{ padding: 28, textAlign: 'center' }}>
                    <button type="button" onClick={retry} style={{ color: 'var(--brand-primary)', fontWeight: 600 }}>
                      加载失败，点击重试
                    </button>
                  </td>
                </tr>
              )}
              {status === 'success' && lessons.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 28, textAlign: 'center', color: 'var(--text-muted)' }}>
                    暂无符合条件的篇目
                  </td>
                </tr>
              )}
              {status === 'success' &&
                lessons.map((lesson) => (
                  <tr key={lesson.id} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{lesson.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{lesson.author}</div>
                    </td>
                    <td style={tdStyle}>{CATEGORY_LABELS[lesson.category]}</td>
                    <td style={tdStyle}>{lesson.ageGroups.join(' / ')} 岁</td>
                    <td style={tdStyle}>{lesson.lines.length} 句</td>
                    <td style={tdStyle}>
                      <button
                        type="button"
                        onClick={() => handleTogglePublish(lesson)}
                        className="pressable"
                        style={{
                          padding: '4px 10px',
                          borderRadius: 99,
                          fontSize: 12,
                          fontWeight: 600,
                          background: lesson.published ? 'var(--brand-jade-soft)' : 'var(--bg-surface-warm)',
                          color: lesson.published ? 'var(--brand-jade)' : 'var(--text-muted)',
                        }}
                      >
                        {lesson.published ? '已上架' : '已下架'}
                      </button>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingLesson(lesson);
                            setDrawerOpen(true);
                          }}
                          style={{
                            color: 'var(--brand-primary)',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Edit3 size={14} />
                          <span>编辑</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(lesson)}
                          style={{
                            color: 'var(--brand-danger)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Trash2 size={14} />
                          <span>删除</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </main>

      <LessonEditorDrawer
        open={drawerOpen}
        editingLesson={editingLesson}
        onClose={() => setDrawerOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
};

const KpiCard: React.FC<{ label: string; value: string; accent: string }> = ({
  label,
  value,
  accent,
}) => (
  <div
    style={{
      background: '#FFFFFF',
      borderRadius: 14,
      padding: '14px 16px',
      border: '1px solid var(--border-subtle)',
    }}
  >
    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
    <div style={{ fontSize: 24, fontWeight: 700, color: accent, marginTop: 4 }}>{value}</div>
  </div>
);

const thStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontWeight: 600,
  fontSize: 12,
};

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
  verticalAlign: 'middle',
};
