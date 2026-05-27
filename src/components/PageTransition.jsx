function PageTransition({ tabKey, children }) {
  return (
    <div key={tabKey} className="animate-page-enter">
      {children}
    </div>
  )
}

export default PageTransition
