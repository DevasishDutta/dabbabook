import './globals.css'

export const metadata = {
  title: 'DabbaBook – Operator Dashboard',
  description: 'Order management for tiffin businesses',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
