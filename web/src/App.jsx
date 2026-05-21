import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { TenantProvider } from "./config/tenant";
import { GenerationQueueProvider } from "./hooks/useGenerationQueue";

import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ChatEmbed from "./pages/ChatEmbed";

// Real Estate
import ListingGenerator from "./pages/real-estate/ListingGenerator";
import REEmailDrafter from "./pages/real-estate/EmailDrafter";
import CMAGenerator from "./pages/real-estate/CMAGenerator";
import NeighborhoodGenerator from "./pages/real-estate/NeighborhoodGenerator";
import REBotManager from "./pages/real-estate/BotManager";
import GenericGenerator from "./pages/real-estate/GenericGenerator";
import SavedListings from "./pages/real-estate/SavedListings";
import Leads from "./pages/real-estate/Leads";
import { REAL_ESTATE_MODULES, CONTRACT_MODULES } from "./pages/real-estate/moduleConfigs";

// Contracts
import ContractList from "./pages/contracts/ContractList";
import ContractBuilder from "./pages/contracts/ContractBuilder";
import ContractView from "./pages/contracts/ContractView";


// Contracting
import ProposalGenerator from "./pages/contracting/ProposalGenerator";
import SOWGenerator from "./pages/contracting/SOWGenerator";
import COEmailDrafter from "./pages/contracting/EmailDrafter";
import JobBrief from "./pages/contracting/JobBrief";
import CompletionLetter from "./pages/contracting/CompletionLetter";
import COBotManager from "./pages/contracting/BotManager";

// Shared
import History from "./pages/shared/History";
import Usage from "./pages/shared/Usage";
import Settings from "./pages/shared/Settings";

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/chat/:token" element={<ChatEmbed />} />

      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />

      {/* Real Estate */}
      <Route path="/re/listing" element={<PrivateRoute><ListingGenerator /></PrivateRoute>} />
      <Route path="/re/email" element={<PrivateRoute><REEmailDrafter /></PrivateRoute>} />
      <Route path="/re/cma" element={<PrivateRoute><CMAGenerator /></PrivateRoute>} />
      <Route path="/re/neighborhood" element={<PrivateRoute><NeighborhoodGenerator /></PrivateRoute>} />
      <Route path="/re/bots" element={<PrivateRoute><REBotManager /></PrivateRoute>} />
      <Route path="/re/saved-listings" element={<PrivateRoute><SavedListings /></PrivateRoute>} />
      <Route path="/re/leads" element={<PrivateRoute><Leads /></PrivateRoute>} />
      <Route path="/re/contracts" element={<PrivateRoute><ContractList /></PrivateRoute>} />
      <Route path="/re/contracts/new" element={<PrivateRoute><ContractBuilder /></PrivateRoute>} />
      <Route path="/re/contracts/:id" element={<PrivateRoute><ContractView /></PrivateRoute>} />

      {REAL_ESTATE_MODULES.map((module) => (
        <Route
          key={module.path}
          path={module.path}
          element={<PrivateRoute><GenericGenerator module={module} /></PrivateRoute>}
        />
      ))}

      {/* Contracting */}
      <Route path="/co/proposal" element={<PrivateRoute><ProposalGenerator /></PrivateRoute>} />
      <Route path="/co/sow" element={<PrivateRoute><SOWGenerator /></PrivateRoute>} />
      <Route path="/co/email" element={<PrivateRoute><COEmailDrafter /></PrivateRoute>} />
      <Route path="/co/job-brief" element={<PrivateRoute><JobBrief /></PrivateRoute>} />
      <Route path="/co/completion" element={<PrivateRoute><CompletionLetter /></PrivateRoute>} />
      <Route path="/co/bots" element={<PrivateRoute><COBotManager /></PrivateRoute>} />
      {CONTRACT_MODULES.map((module) => (
        <Route
          key={module.path}
          path={module.path}
          element={<PrivateRoute><GenericGenerator module={module} /></PrivateRoute>}
        />
      ))}

      {/* Shared */}
      <Route path="/history" element={<PrivateRoute><History /></PrivateRoute>} />
      <Route path="/usage" element={<PrivateRoute><Usage /></PrivateRoute>} />
      <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TenantProvider>
          <GenerationQueueProvider>
            <AppRoutes />
          </GenerationQueueProvider>
        </TenantProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
