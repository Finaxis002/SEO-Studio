import './globals.css'
import { Providers } from './providers'

export const metadata = {
  title: 'SEO Studio — Content & SEO Operations',
  description: 'Create, manage, optimize, publish and analyze blogs and their images from one premium dashboard.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: 'window.addEventListener("error",function(e){if(e.error instanceof DOMException&&e.error.name==="DataCloneError"&&e.message&&e.message.includes("PerformanceServerTiming")){e.stopImmediatePropagation();e.preventDefault()}},true);' }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
