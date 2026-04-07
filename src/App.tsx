import { I18nProvider } from './i18n'
import RotatePrompt from './components/RotatePrompt'
import RippleScreen from './screens/RippleScreen'

export default function App() {
  return (
    <I18nProvider>
      <RotatePrompt />
      <RippleScreen />
    </I18nProvider>
  )
}
