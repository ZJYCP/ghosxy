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
    debug: true, // 开发模式下开启，生产模式请关闭
    fallbackLng: 'en', // 默认语言
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
