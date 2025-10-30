import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthProvider";
import { ProtectedRoute } from "./components/ProtectedRoute";
import App from "./routes/App.tsx";
import TasksPage from "./routes/TasksPage.tsx";
import { tasksLoader, createTaskAction } from "./routes/tasks.loaders";
import { usersLoader } from "./routes/users.loaders";
import UsersPage from "./routes/UsersPage.tsx";
import LoginPage from "./routes/LoginPage.tsx";
import RegisterPage from "./routes/RegisterPage.tsx";

const router = createBrowserRouter([{
  path: "/",
  element: <App />,
  children: [
    { 
      index: true, 
      element: <ProtectedRoute><TasksPage /></ProtectedRoute>, 
      loader: tasksLoader, 
      action: createTaskAction 
    },
    { 
      path: "admin/users", 
      element: <ProtectedRoute><UsersPage /></ProtectedRoute>, 
      loader: usersLoader 
    },
    { path: "login", element: <LoginPage /> },
    { path: "register", element: <RegisterPage /> }
  ]
}]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>
);
