import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import ProductPage from "./pages/Product";
import NotFound from "./pages/NotFound";
import { CartPage, CheckoutPage, SentPage } from "./pages/Cart";
import { BusinessPage, ContactPage, CreatePage, FamilyPage, InfoPage, PromoDetailPage, PromosPage, ResellersPage, WeddingPage } from "./pages/Secondary";

const qc = new QueryClient({ defaultOptions: { queries: { retry: 2, refetchOnWindowFocus: false } } });

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="boutique" element={<Shop />} />
            <Route path="boutique/:categorie" element={<Shop />} />
            <Route path="produit/:slug" element={<ProductPage />} />
            <Route path="creer" element={<CreatePage />} />
            <Route path="promos" element={<PromosPage />} />
            <Route path="promos/:slug" element={<PromoDetailPage />} />
            <Route path="mariage" element={<WeddingPage />} />
            <Route path="famille" element={<FamilyPage />} />
            <Route path="entreprises" element={<BusinessPage />} />
            <Route path="revendeurs" element={<ResellersPage />} />
            <Route path="panier" element={<CartPage />} />
            <Route path="commande" element={<CheckoutPage />} />
            <Route path="commande/envoyee" element={<SentPage />} />
            <Route path="a-propos" element={<InfoPage kind="a_propos" />} />
            <Route path="livraison" element={<InfoPage kind="livraison" />} />
            <Route path="mentions-legales" element={<InfoPage kind="mentions" />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
