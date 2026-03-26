import { NavLink } from 'react-router-dom'

export default function Navbar() {
  return (
    <nav className="navbar">
      <NavLink to="/" className="nav-brand">✨ 光</NavLink>
      <ul className="nav-links">
        <li><NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>首页</NavLink></li>
        <li><NavLink to="/notes" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>学习笔记</NavLink></li>
        <li><NavLink to="/search" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>知识搜索</NavLink></li>
      </ul>
    </nav>
  )
}
