import { useEffect } from 'react'

export default function AdPlaceholder() {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch {}
  }, [])

  return (
    <div className="mt-4">
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-5172957442956044"
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  )
}
