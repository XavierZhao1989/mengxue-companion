import React, { useEffect, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import {
  AGE_GROUP_LABELS,
  CATEGORY_LABELS,
  type AgeGroup,
  type Category,
  type PrimerLesson,
  type VerseLine,
} from '../../types/domain';

interface LessonEditorDrawerProps {
  open: boolean;
  editingLesson: PrimerLesson | null;
  onClose: () => void;
  onSave: (
    payload: Omit<PrimerLesson, 'id' | 'updatedAt'>,
    existingId?: string
  ) => Promise<void>;
}

const ALL_AGES: AgeGroup[] = ['3-4', '5-6', '7-8'];

function createEmptyLine(idx: number): VerseLine {
  return {
    id: `line-${Date.now().toString(36)}-${idx}`,
    text: '',
    pinyin: [],
    vernacular: '',
    parentTip: '',
  };
}

export const LessonEditorDrawer: React.FC<LessonEditorDrawerProps> = ({
  open,
  editingLesson,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState<Category>('mengxue');
  const [ageGroups, setAgeGroups] = useState<AgeGroup[]>(['3-4', '5-6']);
  const [durationMinutes, setDurationMinutes] = useState(5);
  const [summary, setSummary] = useState('');
  const [parentGuide, setParentGuide] = useState('');
  const [published, setPublished] = useState(true);
  const [lines, setLines] = useState<Array<{ id: string; text: string; pinyinText: string; vernacular: string; parentTip: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    if (editingLesson) {
      setTitle(editingLesson.title);
      setSubtitle(editingLesson.subtitle);
      setAuthor(editingLesson.author);
      setCategory(editingLesson.category);
      setAgeGroups(editingLesson.ageGroups);
      setDurationMinutes(editingLesson.durationMinutes);
      setSummary(editingLesson.summary);
      setParentGuide(editingLesson.parentGuide);
      setPublished(editingLesson.published);
      setLines(
        editingLesson.lines.map((l) => ({
          id: l.id,
          text: l.text,
          pinyinText: l.pinyin.map((p) => (p === '' ? '_' : p)).join(' '),
          vernacular: l.vernacular,
          parentTip: l.parentTip,
        }))
      );
    } else {
      setTitle('');
      setSubtitle('');
      setAuthor('佚名');
      setCategory('poetry');
      setAgeGroups(['3-4', '5-6']);
      setDurationMinutes(5);
      setSummary('');
      setParentGuide('陪伴孩子逐句轻声朗读，注意观察画面的颜色和动作。');
      setPublished(true);
      setLines([
        {
          id: createEmptyLine(1).id,
          text: '白日依山尽，',
          pinyinText: 'bái rì yī shān jìn _',
          vernacular: '太阳挨着远远的群山慢慢落下去了。',
          parentTip: '问问孩子：傍晚太阳落山时天空会变成什么颜色？',
        },
      ]);
    }
  }, [open, editingLesson]);

  if (!open) return null;

  const toggleAge = (age: AgeGroup) => {
    setAgeGroups((prev) =>
      prev.includes(age) ? prev.filter((a) => a !== age) : [...prev, age]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('请填写篇目标题');
      return;
    }
    if (ageGroups.length === 0) {
      setFormError('请至少选择一个适龄阶段');
      return;
    }
    const validLines = lines.filter((l) => l.text.trim().length > 0);
    if (validLines.length === 0) {
      setFormError('请至少保留一句有效的蒙学正文');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const normalizedLines: VerseLine[] = validLines.map((l) => {
        const chars = Array.from(l.text.trim());
        const tokens = l.pinyinText
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .map((t) => (t === '_' ? '' : t));

        const alignedPinyin = chars.map((ch, idx) => {
          if (/[，。！？、；：“”‘’]/.test(ch)) return '';
          return tokens[idx] ?? '';
        });

        return {
          id: l.id,
          text: l.text.trim(),
          pinyin: alignedPinyin,
          vernacular: l.vernacular.trim() || '家长可用通俗生活语言向孩子讲解本句含义。',
          parentTip: l.parentTip.trim() || '和孩子一起模仿句子里的画面或动作。',
        };
      });

      await onSave(
        {
          title: title.trim(),
          subtitle: subtitle.trim() || '亲子每日 5 分钟启蒙精读',
          author: author.trim() || '经典汇编',
          category,
          ageGroups,
          durationMinutes: Math.max(1, Number(durationMinutes) || 5),
          summary: summary.trim() || '适合亲子睡前或晨起跟读的经典蒙学短篇。',
          parentGuide: parentGuide.trim() || '鼓励孩子大声跟读，重在兴趣与节奏感。',
          published,
          lines: normalizedLines,
          charNotes: editingLesson?.charNotes ?? [],
        },
        editingLesson?.id
      );
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={editingLesson ? '编辑蒙学篇目' : '新增蒙学篇目'}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 90,
        background: 'rgba(17, 19, 24, 0.45)',
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(540px, 100vw)',
          height: '100%',
          background: '#FFFFFF',
          boxShadow: '-12px 0 32px rgba(0, 0, 0, 0.16)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 className="t-h1" style={{ margin: 0 }}>
            {editingLesson ? `编辑《${editingLesson.title}》` : '新增蒙学篇目'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭编辑抽屉"
            className="touch-target pressable"
            style={{ width: 40, height: 40, borderRadius: 99, color: 'var(--text-secondary)' }}
          >
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="scroll-y"
          style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          {formError && (
            <div
              style={{
                background: 'var(--brand-danger-soft)',
                color: 'var(--brand-danger)',
                padding: '10px 14px',
                borderRadius: 10,
                fontSize: 13,
              }}
            >
              {formError}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={labelStyle}>
              <span>篇目标题 *</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="如：登鹳雀楼"
                style={inputStyle}
              />
            </label>
            <label style={labelStyle}>
              <span>作者 / 朝代</span>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="如：王之涣（唐）"
                style={inputStyle}
              />
            </label>
          </div>

          <label style={labelStyle}>
            <span>副标题</span>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="一句话亮点说明"
              style={inputStyle}
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 12 }}>
            <label style={labelStyle}>
              <span>分类</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                style={inputStyle}
              >
                {(Object.keys(CATEGORY_LABELS) as Category[]).map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </label>

            <label style={labelStyle}>
              <span>预计时长(分钟)</span>
              <input
                type="number"
                min={1}
                max={30}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                style={inputStyle}
              />
            </label>
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>适龄阶段 *</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {ALL_AGES.map((age) => {
                const selected = ageGroups.includes(age);
                return (
                  <button
                    key={age}
                    type="button"
                    onClick={() => toggleAge(age)}
                    className="pressable"
                    style={{
                      padding: '6px 12px',
                      borderRadius: 99,
                      fontSize: 12,
                      fontWeight: 600,
                      background: selected ? 'var(--brand-primary)' : 'var(--bg-surface-warm)',
                      color: selected ? '#FFFFFF' : 'var(--text-secondary)',
                    }}
                  >
                    {AGE_GROUP_LABELS[age]}
                  </button>
                );
              })}
            </div>
          </div>

          <label style={labelStyle}>
            <span>内容简介（展示在列表与今日卡片）</span>
            <textarea
              rows={2}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </label>

          <label style={labelStyle}>
            <span>家长伴读小贴士</span>
            <input
              type="text"
              value={parentGuide}
              onChange={(e) => setParentGuide(e.target.value)}
              style={inputStyle}
            />
          </label>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>立即上架到家长端</span>
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: 'var(--brand-jade)' }}
            />
          </div>

          {/* Lines Editor */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 14 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 700 }}>
                逐句正文与家长白话 ({lines.length} 句)
              </span>
              <button
                type="button"
                onClick={() =>
                  setLines((prev) => [
                    ...prev,
                    {
                      id: `line-${Date.now().toString(36)}-${prev.length}`,
                      text: '',
                      pinyinText: '',
                      vernacular: '',
                      parentTip: '',
                    },
                  ])
                }
                className="pressable"
                style={{
                  padding: '5px 10px',
                  borderRadius: 8,
                  background: 'var(--brand-primary-soft)',
                  color: 'var(--brand-primary)',
                  fontSize: 12,
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Plus size={14} />
                <span>加一句</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {lines.map((line, idx) => (
                <div
                  key={line.id}
                  style={{
                    background: 'var(--bg-canvas)',
                    borderRadius: 12,
                    padding: 12,
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                      第 {idx + 1} 句
                    </span>
                    {lines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                        style={{ color: 'var(--brand-danger)', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 3 }}
                      >
                        <Trash2 size={13} />
                        <span>删除</span>
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="句子正文，如：白日依山尽，"
                    value={line.text}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLines((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, text: val } : item))
                      );
                    }}
                    style={inputStyle}
                  />
                  <input
                    type="text"
                    placeholder="逐字拼音（空格分隔，标点填 _ ）"
                    value={line.pinyinText}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLines((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, pinyinText: val } : item))
                      );
                    }}
                    style={inputStyle}
                  />
                  <input
                    type="text"
                    placeholder="给孩子这样讲（白话）"
                    value={line.vernacular}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLines((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, vernacular: val } : item))
                      );
                    }}
                    style={inputStyle}
                  />
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              paddingTop: 12,
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="pressable"
              style={{
                padding: '10px 18px',
                borderRadius: 10,
                background: 'var(--bg-surface-warm)',
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="pressable"
              style={{
                padding: '10px 22px',
                borderRadius: 10,
                background: 'var(--brand-primary)',
                color: '#FFFFFF',
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              {saving ? '保存中…' : '保存并同步到家长端'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--text-primary)',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 10,
  border: '1px solid var(--border-strong)',
  background: '#FFFFFF',
  fontSize: 14,
  color: 'var(--text-primary)',
};
