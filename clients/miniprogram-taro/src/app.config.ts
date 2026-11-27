export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/library/index',
    'pages/profile/index',
    'pages/reader/index',
  ],
  window: {
    navigationStyle: 'custom',
    backgroundColor: '#FAF7F2',
    backgroundTextStyle: 'dark',
  },
  tabBar: {
    color: '#9A8F84',
    selectedColor: '#C85A32',
    backgroundColor: '#FFFFFF',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/home/index',
        text: '今日伴读',
      },
      {
        pagePath: 'pages/library/index',
        text: '蒙学馆',
      },
      {
        pagePath: 'pages/profile/index',
        text: '伴学档案',
      },
    ],
  },
});
