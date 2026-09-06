import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App'
import { I18nProvider } from './i18n'
import { registerPwa } from './lib/registerPwa'

// Kept out of the interface but still readable, as `document.documentElement.dataset.build`,
// so a visitor served an old build by their service worker can be identified.
document.documentElement.dataset.build = __BUILD_ID__

registerPwa()

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <App />
      </I18nProvider>
    </QueryClientProvider>
  </StrictMode>,
)
