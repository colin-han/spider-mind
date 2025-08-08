import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Theme } from '@radix-ui/themes'
import { AuthProvider } from '@/contexts/auth-context'
import './globals.css'
import '@radix-ui/themes/styles.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Spider Mind - AI思维导图',
  description: '基于AI的智能思维导图工具',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased dark`}>
        <Theme accentColor="violet" grayColor="sand" appearance="dark">
          <AuthProvider>{children}</AuthProvider>
        </Theme>
      </body>
    </html>
  )
}
