import Script from 'next/script'

export function ThemeScript() {
  return (
    <Script id="fusion-theme-init" strategy="beforeInteractive">
      {`
        try {
          const theme = localStorage.getItem('theme');
          const isDark = theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
          if (isDark) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        } catch (e) {}
      `}
    </Script>
  )
}
