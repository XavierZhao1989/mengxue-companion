import { PropsWithChildren, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { CLOUD_ENV_ID } from './services/client';
import './app.scss';

export default function App({ children }: PropsWithChildren) {
  useEffect(() => {
    if (CLOUD_ENV_ID && typeof wx !== 'undefined' && wx.cloud) {
      wx.cloud.init({
        env: CLOUD_ENV_ID,
        traceUser: true,
      });
    } else if (process.env.TARO_ENV === 'weapp') {
      Taro.getSystemInfoAsync({}).catch(() => {});
    }
  }, []);

  return children;
}
