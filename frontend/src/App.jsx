import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import CatalogPage from './pages/CatalogPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import RecoverPasswordPage from './pages/RecoverPasswordPage';
import CreditsPage from './pages/CreditsPage';
import AccountLayout from './pages/account/AccountLayout';
import MyOrdersPage from './pages/account/MyOrdersPage';
import OrderDetailPage from './pages/account/OrderDetailPage';
import ProfilePage from './pages/account/ProfilePage';
import ChangePasswordPage from './pages/account/ChangePasswordPage';
import AdminLayout from './pages/admin/AdminLayout';
import DashboardPage from './pages/admin/DashboardPage';
import ProductsAdminPage from './pages/admin/ProductsAdminPage';
import UsersAdminPage from './pages/admin/UsersAdminPage';
import './assets/styles.css';

export default function App() {
    return (
        <BrowserRouter>
            <ToastProvider>
                <AuthProvider>
                    <CartProvider>
                        <Routes>
                            <Route element={<Layout />}>
                                {/* tienda pública */}
                                <Route path="/" element={<HomePage />} />
                                <Route path="/catalogo" element={<CatalogPage />} />
                                <Route path="/producto/:id" element={<ProductDetailPage />} />
                                <Route path="/carrito" element={<CartPage />} />
                                <Route path="/ingresar" element={<LoginPage />} />
                                <Route path="/registro" element={<RegisterPage />} />
                                <Route path="/recuperar" element={<RecoverPasswordPage />} />
                                <Route path="/creditos" element={<CreditsPage />} />

                                {/* con sesión iniciada */}
                                <Route element={<ProtectedRoute message="Inicie sesión para continuar con el pago. Su carrito se conserva." />}>
                                    <Route path="/pago" element={<CheckoutPage />} />
                                </Route>
                                <Route element={<ProtectedRoute message="Inicie sesión para ver sus pedidos y sus datos." />}>
                                    <Route path="/cuenta" element={<AccountLayout />}>
                                        <Route index element={<MyOrdersPage />} />
                                        <Route path="pedido/:numero" element={<OrderDetailPage />} />
                                        <Route path="datos" element={<ProfilePage />} />
                                        <Route path="clave" element={<ChangePasswordPage />} />
                                    </Route>
                                </Route>

                                {/* solo administradores (RF-30) */}
                                <Route element={<ProtectedRoute roles={['admin']} message="Inicie sesión con una cuenta de administrador para entrar al panel." />}>
                                    <Route path="/admin" element={<AdminLayout />}>
                                        <Route index element={<DashboardPage />} />
                                        <Route path="productos" element={<ProductsAdminPage />} />
                                        <Route path="usuarios" element={<UsersAdminPage />} />
                                    </Route>
                                </Route>

                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Route>
                        </Routes>
                    </CartProvider>
                </AuthProvider>
            </ToastProvider>
        </BrowserRouter>
    );
}
