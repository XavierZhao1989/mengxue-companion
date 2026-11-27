import { PropsWithChildren } from 'react';
import { useLaunch } from '@tarojs/taro';
import { CLOUD_ENV_ID } from './services/client';
import './app.scss';

export default function App({ children }: PropsWithChildren) {
  useLaunch(() => {
    if (CLOUD_ENV_ID && typeof wx !== 'undefined' && wx.cloud) {
      wx.cloud.init({
        env: CLOUD_ENV_ID,
        traceUser: true,
      });
    }
  });

  return children;
}
