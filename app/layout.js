export const metadata = {
  title: 'DabbaBook — Smart Tiffin Management',
  description: 'Manage your tiffin business without the chaos. Powered by Ready-To-Eat ADs.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
