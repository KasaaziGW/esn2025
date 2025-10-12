// Modern Navbar JavaScript Functionality

// Toggle sidebar collapse/expand
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const mainContent = document.getElementById("mainContent");
  const toggleBtn = document.getElementById("sidebarToggle");
  const icon = toggleBtn.querySelector("i");

  sidebar.classList.toggle("collapsed");
  mainContent.classList.toggle("expanded");

  // Change icon based on state
  if (sidebar.classList.contains("collapsed")) {
    icon.className = "fas fa-bars";
  } else {
    icon.className = "fas fa-times";
  }

  // Store preference in localStorage
  localStorage.setItem(
    "sidebarCollapsed",
    sidebar.classList.contains("collapsed")
  );
}

// Toggle submenu
function toggleSubmenu(event) {
  event.preventDefault();
  const submenu = document.getElementById("chatSubmenu");
  const isCollapsed = document
    .getElementById("sidebar")
    .classList.contains("collapsed");

  // If sidebar is collapsed, don't show submenu
  if (isCollapsed) {
    return;
  }

  submenu.classList.toggle("show");
}

// Initialize sidebar state from localStorage
function initializeSidebar() {
  const isCollapsed = localStorage.getItem("sidebarCollapsed") === "true";
  const sidebar = document.getElementById("sidebar");
  const mainContent = document.getElementById("mainContent");
  const toggleBtn = document.getElementById("sidebarToggle");
  const icon = toggleBtn.querySelector("i");

  if (isCollapsed) {
    sidebar.classList.add("collapsed");
    mainContent.classList.add("expanded");
    icon.className = "fas fa-bars";
  } else {
    icon.className = "fas fa-times";
  }
}

// Auto-hide submenu when sidebar is collapsed
function handleSidebarCollapse() {
  const sidebar = document.getElementById("sidebar");
  const submenu = document.getElementById("chatSubmenu");

  if (sidebar.classList.contains("collapsed")) {
    submenu.classList.remove("show");
  }
}

// Enhanced sidebar toggle with submenu handling
const originalToggleSidebar = toggleSidebar;
toggleSidebar = function () {
  originalToggleSidebar();
  setTimeout(handleSidebarCollapse, 300); // Wait for animation to complete
};

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  initializeSidebar();

  // Add click outside to close mobile sidebar
  document.addEventListener("click", function (event) {
    const sidebar = document.getElementById("sidebar");
    const toggleBtn = document.getElementById("sidebarToggle");

    if (
      window.innerWidth <= 768 &&
      !sidebar.contains(event.target) &&
      !toggleBtn.contains(event.target)
    ) {
      sidebar.classList.remove("show");
    }
  });

  // Handle window resize
  window.addEventListener("resize", function () {
    if (window.innerWidth > 768) {
      document.getElementById("sidebar").classList.remove("show");
    }
  });
});

// Smooth scroll for sidebar
function smoothScrollToTop() {
  document.getElementById("sidebar").scrollTo({
    top: 0,
    behavior: "smooth",
  });
}
