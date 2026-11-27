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
        iconPath: 'assets/tab/home.png',
        selectedIconPath: 'assets/tab/home-active.png',
      },
      {
        pagePath: 'pages/library/index',
        text: '蒙学馆',
        iconPath: 'assets/tab/library.png',
        selectedIconPath: 'assets/tab/library-active.png',
      },
      {
        pagePath: 'pages/profile/index',
        text: '伴学档案',
        iconPath: 'assets/tab/profile.png',
        selectedIconPath: 'assets/tab/profile-active.png',
      },
    ],
  },
});
