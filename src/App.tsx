import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";

const Shop = lazy(() => import("./pages/Shop"));
const ProductPage = lazy(() => import("./pages/Product"));
const NotFound = lazy(() => import("./pages/NotFound"));
const cart = () => import("./pages/Cart");
const CartPage = lazy(() => cart().then((m) => ({ default: m.CartPage })));
const CheckoutPage = lazy(() => cart().then((m) => ({ default: m.CheckoutPage })));
const SentPage = lazy(() => cart().then((m) => ({ default: m.SentPage })));
const sec = () => import("./pages/Secondary");
const PromosPage = lazy(() => sec().then((m) => ({ default: m.PromosPage })));
const PromoDetailPage = lazy(() => sec().then((m) => ({ default: m.PromoDetailPage })));
const WeddingPage = lazy(() => sec().then((m) => ({ default: m.WeddingPage })));
const FamilyPage = lazy(() => sec().then((m) => ({ default: m.FamilyPage })));
const BusinessPage = lazy(() => sec().then((m) => ({ default: m.BusinessPage })));
const ResellersPage = lazy(() => sec().then((m) => ({ default: m.ResellersPage })));
const CreatePage = lazy(() => sec().then((m) => ({ default: m.CreatePage })));
const InfoPage = lazy(() => sec().then((m) => ({ default: m.InfoPage })));
const ContactPage = lazy(() => sec().then((m) => ({ default: m.ContactPage })));

const qc = new QueryClient({ defaultOptions: { queries: { retry: 2, refetchOnWindowFocus: false } } });
const Fallback = () => <div className="loading-page"><div className="sk" style={{ width: "min(90%,1100px)", height: 360 }} /></div>;

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Suspense fallback={<Fallback />}>
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
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
