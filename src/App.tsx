import { Route, Routes } from 'react-router-dom'
import { CustomToolsProvider } from '@/hooks/use-custom-tools'
import { AppLayout } from '@/layouts/AppLayout'
import { Dashboard } from '@/pages/Dashboard'
import { NotFound } from '@/pages/NotFound'
import { Base64Page } from '@/tools/base64/Base64Page'
import { CronPage } from '@/tools/cron/CronPage'
import { JsonXmlPage } from '@/tools/json-xml/JsonXmlPage'
import { JwtPage } from '@/tools/jwt/JwtPage'
import { PasswordPage } from '@/tools/password/PasswordPage'
import { RegexPage } from '@/tools/regex/RegexPage'
import { TimestampPage } from '@/tools/timestamp/TimestampPage'
import { UrlPage } from '@/tools/url-encoder/UrlPage'

export default function App() {
  return (
    <CustomToolsProvider>
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="json-xml" element={<JsonXmlPage />} />
        <Route path="timestamp" element={<TimestampPage />} />
        <Route path="regex" element={<RegexPage />} />
        <Route path="base64" element={<Base64Page />} />
        <Route path="url" element={<UrlPage />} />
        <Route path="jwt" element={<JwtPage />} />
        <Route path="password" element={<PasswordPage />} />
        <Route path="cron" element={<CronPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
    </CustomToolsProvider>
  )
}
