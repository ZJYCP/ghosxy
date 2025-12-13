import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import en from './locales/en.json'
import zh from './locales/zh.json'

i18n
  // 检测用户语言
  .use(LanguageDetector)
  // 注入 React
  .use(initReactI18next)
  .init({
    debug: false, // 生产环境关闭调试
    fallbackLng: 'zh', // 默认语言改为中文
    lng: 'zh', // 强制初始语言为中文
    interpolation: {
      escapeValue: false // React 默认已经防 XSS，不需要 i18n 再转义
    },
    resources: {
      en: {
        translation: en
      },
      zh: {
        translation: zh
      }
    }
  })

export default i18n
