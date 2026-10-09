export default function App(): React.JSX.Element {
  return (
    <main className="grid min-h-screen place-content-center gap-3 bg-slate-950 p-6 text-center text-slate-100">
      <h1 className="text-4xl font-bold tracking-wide">BARDHIE</h1>
      <p>Desktop application is running.</p>
      <p>
        Platform: <code>{window.bardhie.platform}</code>
      </p>
    </main>
  )
}
