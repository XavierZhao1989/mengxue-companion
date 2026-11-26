import React, { useState } from 'react';
import {
  Eye,
  LayoutDashboard,
  Layers,
  Smartphone,
  Sparkles,
  Wifi,
} from 'lucide-react';
import type { SimDeviceMode, SimNetworkMode } from '../../types/domain';

interface InspectorPanelProps {
  deviceMode: SimDeviceMode;
  simMode: SimNetworkMode;
  specOverlay: boolean;
  onChangeDevice: (mode: SimDeviceMode) => void;
  onChangeSimMode: (mode: SimNetworkMode) => void;
  onToggleSpecOverlay: () => void;
  onJumpStepDemo: (step: number) => void;
}

const DEVICE_OPTIONS: Array<{ id: SimDeviceMode; label: string; desc: string }> = [
  { id: 'iphone15', label: 'iPhone 15 Pro', desc: '393×852 · 灵动岛安全区' },
  { id: 'iphonese', label: 'iPhone SE 小屏', desc: '375×667 · 检验小屏不溢出' },
  { id: 'miniprogram', label: '微信小程序', desc: '顶部右侧胶囊避让布局' },
  { id: 'admin', label: 'PC 管理后台', desc: '宽屏内容配置与实时同步' },
];

const STATE_OPTIONS: Array<{ id: SimNetworkMode; label: string }> = [
  { id: 'normal', label: '正常态' },
  { id: 'loading', label: '骨架屏加载' },
  { id: 'slow', label: '弱网 2.5s' },
  { id: 'empty', label: '空态引导' },
  { id: 'error', label: '接口报错' },
  { id: 'offline', label: '离线缓存' },
];

const QA_CHECKLIST_STEPS = [
  {
    step: 1,
    title: '① 核心场景',
    detail: '3–8 岁家长睡前 5 分钟单手陪读与打卡，借助「点字白话锦囊」降低伴读门槛。',
    actionLabel: '查看今日主任务卡',
  },
  {
    step: 2,
    title: '② 路径与多端',
    detail: '3 个主 Tab + 沉浸领读页，记忆来源 returnTab 返回栈，并适配微信小程序胶囊避让。',
    actionLabel: '切换小程序避让态',
  },
  {
    step: 3,
    title: '③ 空态与容错',
    detail: '显式 5 态模型 + 800ms 弱网提示 + AbortController 防竞态 + 失败保留本地进度与一键重试。',
    actionLabel: '模拟接口超时错误态',
  },
  {
    step: 4,
    title: '④ 排版与规范',
    detail: '宣纸暖白护眼色阶、8pt 间距网格、底部拇指热区 ≥44pt、375px 小屏零挤压。',
    actionLabel: '开启设计标注透视',
  },
  {
    step: 5,
    title: '⑤ 后台联动',
    detail: 'React 19 + TS 严格模式 + CSS Tokens + PC 运营后台增删改实时同步家长端。',
    actionLabel: '打开 PC 管理后台',
  },
];

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  deviceMode,
  simMode,
  specOverlay,
  onChangeDevice,
  onChangeSimMode,
  onToggleSpecOverlay,
  onJumpStepDemo,
}) => {
  const [openStep, setOpenStep] = useState<number>(1);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        color: '#E5E7EB',
      }}
    >
      <div>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11,
            fontWeight: 600,
            color: '#FDBA9B',
            background: 'rgba(200, 90, 50, 0.2)',
            padding: '3px 9px',
            borderRadius: 99,
            marginBottom: 8,
          }}
        >
          <Sparkles size={12} />
          <span>UI & QA 验收台</span>
        </div>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#FFFFFF' }}>
          启蒙小笺 · 多端验收面板
        </h2>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9CA3AF', lineHeight: '18px' }}>
          上线前自测：多屏安全区、弱网容错与设计规范走查。
        </p>
      </div>

      {/* 1. Device & Platform Switch */}
      <section style={panelCardStyle}>
        <div style={sectionHeaderStyle}>
          <Smartphone size={14} />
          <span>端与屏幕形态切换</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {DEVICE_OPTIONS.map((item) => {
            const active = deviceMode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChangeDevice(item.id)}
                className="pressable"
                style={{
                  textAlign: 'left',
                  padding: '8px 10px',
                  borderRadius: 10,
                  background: active ? 'var(--brand-primary)' : '#2B2F38',
                  color: '#FFFFFF',
                  border: active ? '1px solid #FDBA9B' : '1px solid transparent',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600 }}>{item.label}</div>
                <div style={{ fontSize: 10, opacity: 0.78, marginTop: 2 }}>{item.desc}</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. Network & State Injection */}
      <section style={panelCardStyle}>
        <div style={sectionHeaderStyle}>
          <Wifi size={14} />
          <span>页面全状态注入（空 / 错 / 弱网）</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {STATE_OPTIONS.map((item) => {
            const active = simMode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChangeSimMode(item.id)}
                className="pressable"
                style={{
                  padding: '7px 6px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: active ? 600 : 500,
                  background: active ? '#2F7D63' : '#2B2F38',
                  color: '#FFFFFF',
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. Design Spec Overlay */}
      <section style={panelCardStyle}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}>
            <Eye size={14} style={{ color: '#93C5FD' }} />
            <span>设计规范透视层</span>
          </div>
          <button
            type="button"
            onClick={onToggleSpecOverlay}
            className="pressable"
            style={{
              padding: '5px 12px',
              borderRadius: 99,
              fontSize: 12,
              fontWeight: 600,
              background: specOverlay ? '#2563EB' : '#2B2F38',
              color: '#FFFFFF',
            }}
          >
            {specOverlay ? '已开启标注' : '点击开启'}
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8, fontSize: 11, color: '#9CA3AF' }}>
          <span>🔴 安全区/胶囊区</span>
          <span>🟣 ≥44pt 触控热区</span>
          <span>🔵 字号层级</span>
          <span>🟢 8pt 间距</span>
        </div>
      </section>

      {/* 4. Product & Engineering QA Checklist */}
      <section style={panelCardStyle}>
        <div style={sectionHeaderStyle}>
          <Layers size={14} />
          <span>产品与工程 5 维自查</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {QA_CHECKLIST_STEPS.map((item) => {
            const expanded = openStep === item.step;
            return (
              <div
                key={item.step}
                style={{
                  background: '#2B2F38',
                  borderRadius: 10,
                  overflow: 'hidden',
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpenStep(expanded ? 0 : item.step)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '9px 10px',
                    fontSize: 12,
                    fontWeight: 600,
                    color: expanded ? '#FDBA9B' : '#E5E7EB',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>{item.title}</span>
                  <span>{expanded ? '−' : '+'}</span>
                </button>
                {expanded && (
                  <div style={{ padding: '0 10px 10px', fontSize: 11, color: '#D1D5DB', lineHeight: '17px' }}>
                    <p style={{ margin: '0 0 8px' }}>{item.detail}</p>
                    <button
                      type="button"
                      onClick={() => onJumpStepDemo(item.step)}
                      className="pressable"
                      style={{
                        padding: '5px 10px',
                        borderRadius: 6,
                        background: 'rgba(200, 90, 50, 0.25)',
                        color: '#FDBA9B',
                        fontSize: 11,
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <LayoutDashboard size={12} />
                      <span>{item.actionLabel}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

const panelCardStyle: React.CSSProperties = {
  background: 'var(--bg-inspector-card)',
  borderRadius: 12,
  padding: 12,
  border: '1px solid rgba(255, 255, 255, 0.08)',
};

const sectionHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 12,
  fontWeight: 600,
  color: '#D1D5DB',
  marginBottom: 10,
};
