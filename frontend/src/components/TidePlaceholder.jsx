export default function TidePlaceholder() {
  return (
    <div className="mt-4 bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
      <span className="text-3xl leading-none">🌊</span>
      <div>
        <h3 className="text-sm font-semibold text-white/70">Tide info coming soon</h3>
        <p className="text-white/35 text-xs mt-0.5">High & low tide times for each beach</p>
      </div>
      <span className="ml-auto text-xs bg-seafoam/15 text-seafoam px-2 py-0.5 rounded-full font-medium flex-shrink-0">
        Soon
      </span>
    </div>
  )
}
