(function () {
  const routes = {
    home: '/',
    rent: '/vehicleListing.html',
    vehicles: '/vehicleListing.html',
    vehicle: '/vehicleListing.html',
    list: '/vehicleListing.html',
    booking: '/dashboard_customer.html',
    bookings: '/dashboard_customer.html',
    'my bookings': '/dashboard_customer.html',
    dashboard: '/dashboard_customer.html',
    payments: '/payment.html',
    payment: '/payment.html',
    login: '/login.html',
    signup: '/signup.html',
    'sign up': '/signup.html',
    support: '/dashboard_customer.html',
    settings: '/dashboard_customer.html',
    profile: '/iddentity_hub.html',
    account: '/iddentity_hub.html',
  };

  function normalize(text) {
    return (text || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function go(path) {
    if (!path) return;
    window.location.href = path;
  }

  function routeForElement(el) {
    const text = normalize(el.textContent || el.getAttribute('aria-label'));
    if (text.includes('logout')) return 'logout';
    if (text.includes('my bookings')) return routes['my bookings'];
    if (text.includes('sign up') || text.includes('signup')) return routes.signup;
    if (text.includes('login')) return routes.login;
    if (text.includes('payment')) return routes.payment;
    if (text.includes('booking')) return routes.bookings;
    if (text.includes('rental history') || text.includes('favorite')) return routes.dashboard;
    if (text.includes('account') || text.includes('profile') || text.includes('identity')) return routes.profile;
    if (text.includes('vehicle') || text.includes('rent') || text.includes('list') || text.includes('browse luxury') || text.includes('browse collection')) return routes.vehicles;
    if (text.includes('dashboard')) return routes.dashboard;
    if (text.includes('home')) return routes.home;
    if (text.includes('support') || text.includes('help')) return routes.support;
    if (text.includes('setting')) return routes.settings;
    return null;
  }

  function enhanceLinks() {
    document.querySelectorAll('a, button').forEach(el => {
      if (el.dataset.vroomBound === 'true') return;
      if (el.matches('.confirm-btn, .btn-complete, .btn-book, .reserve-btn')) return;
      if (el.matches('[data-vroom-skip-route], [type="submit"], #loginBtn, #signupBtn')) return;
      if (el.hasAttribute('onclick')) return;

      const existingHref = el.getAttribute('href');
      const route = routeForElement(el);
      const isPlaceholder = !existingHref || existingHref === '#';

      if (!route || !isPlaceholder) return;

      el.dataset.vroomBound = 'true';

      if (el.tagName === 'A' && route !== 'logout') {
        el.setAttribute('href', route);
      }

      el.addEventListener('click', event => {
        if (route === 'logout') {
          event.preventDefault();
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          go(routes.login);
          return;
        }

        event.preventDefault();
        go(route);
      });
    });
  }

  function enhanceAuthButtons() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const dashboardRoute = user?.role === 'vendor'
      ? '/dashboard_vendor.html'
      : user?.role === 'admin'
        ? '/dashboard/index.html'
        : routes.dashboard;

    if (user?.name) {
      document.querySelectorAll('.user-name').forEach(el => {
        el.textContent = user.name;
      });

      document.querySelectorAll('.user-avatar, .avatar').forEach(el => {
        el.textContent = user.name
          .split(' ')
          .map(part => part[0])
          .join('')
          .slice(0, 2)
          .toUpperCase();
      });
    }

    if (!token) return;

    document.querySelectorAll('.btn-login').forEach(button => {
      button.textContent = 'Dashboard';
      button.addEventListener('click', event => {
        event.preventDefault();
        go(dashboardRoute);
      });
    });

    document.querySelectorAll('.btn-signup').forEach(button => {
      button.textContent = 'Logout';
      button.addEventListener('click', event => {
        event.preventDefault();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        go(routes.login);
      });
    });
  }

  function enhanceLogoLinks() {
    document.querySelectorAll('.logo, .nav-logo, .topnav-logo, .logo-wrap, .sidebar-logo').forEach(el => {
      if (el.dataset.vroomLogoBound === 'true') return;

      el.dataset.vroomLogoBound = 'true';
      el.style.cursor = 'pointer';

      if (el.tagName === 'A') {
        el.setAttribute('href', routes.home);
        return;
      }

      el.setAttribute('role', 'link');
      el.setAttribute('tabindex', '0');

      el.addEventListener('click', () => go(routes.home));
      el.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          go(routes.home);
        }
      });
    });
  }

  async function hydrateCustomerDashboard() {
    if (!location.pathname.toLowerCase().endsWith('/dashboard_customer.html')) return;

    const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
    const token = localStorage.getItem('token');
    if (!token || storedUser?.role !== 'user') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login.html?role=user';
      return;
    }

    let backendBookings = [];

    if (token) {
      try {
        const res = await fetch('/api/bookings/my', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok && data.success) backendBookings = data.bookings || [];
      } catch (error) {
      }
    }

    try {
      const bookings = backendBookings;
      const active = bookings.filter(item => !['cancelled', 'completed'].includes(item.status)).length;
      const total = bookings.length;
      const spent = bookings.reduce((sum, item) => sum + Number(item.total_price || 0), 0);

      const statValues = document.querySelectorAll('.stat-value');
      if (statValues[0]) statValues[0].textContent = active;
      if (statValues[1]) statValues[1].textContent = total;
      if (statValues[2]) statValues[2].textContent = `Rs. ${spent.toLocaleString('en-IN')}`;

      const cardValues = document.querySelectorAll('.cards-grid .card-value');
      if (cardValues[0]) cardValues[0].textContent = active;
      if (cardValues[1]) cardValues[1].textContent = `Rs. ${spent.toLocaleString('en-IN')}`;

      const activeBadge = document.querySelector('.growth-badge');
      if (activeBadge) activeBadge.textContent = `${active} Active`;

      const bookedFilter = document.querySelector('.fleet-filters .rented');
      if (bookedFilter) bookedFilter.textContent = `Booked (${active})`;

      const tbody = document.getElementById('activityBody');
      if (tbody && bookings.length > 0) {
        tbody.innerHTML = bookings.map(booking => `
          <tr>
            <td class="vehicle-name">${booking.car_name || 'Vehicle'}</td>
            <td>${String(booking.start_date).slice(0, 10)} - ${String(booking.end_date).slice(0, 10)}</td>
            <td class="cost">Rs. ${Number(booking.total_price || 0).toLocaleString('en-IN')}</td>
            <td>-</td>
            <td><span class="badge ${booking.status === 'cancelled' ? 'badge-red' : booking.status === 'confirmed' ? 'badge-green' : 'badge-orange'}">${booking.status}</span></td>
            <td><div class="action-btns"><div class="action-btn" onclick="viewTrip('${booking.car_name || 'Vehicle'}')">View</div></div></td>
          </tr>
        `).join('');
      }

      const requestsContainer = document.querySelector('.requests-container');
      if (requestsContainer) {
        const staticItems = requestsContainer.querySelectorAll('.request-item');
        staticItems.forEach(item => item.remove());

        const viewAll = requestsContainer.querySelector('.view-all');
        const renderedBookings = bookings.length > 0
          ? bookings.slice(0, 5).map(booking => buildDashboardBookingItem(booking)).join('')
          : '<div class="request-item"><div class="request-avatar">VN</div><div class="request-info"><div class="request-name">No<br>Bookings</div><div class="request-details">Search vehicles<br>to start</div></div></div>';

        if (viewAll) {
          viewAll.insertAdjacentHTML('beforebegin', renderedBookings);
        } else {
          requestsContainer.insertAdjacentHTML('beforeend', renderedBookings);
        }
      }
    } catch (error) {
    }
  }

  function bookingInitials(name) {
    return String(name || 'VN')
      .split(/\s+/)
      .filter(Boolean)
      .map(part => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  function buildDashboardBookingItem(booking) {
    const start = String(booking.start_date || '').slice(0, 10);
    const end = String(booking.end_date || '').slice(0, 10);
    const total = Number(booking.total_price || 0).toLocaleString('en-IN');
    const canCancel = !['cancelled', 'completed'].includes(booking.status);

    return `
      <div class="request-item" data-booking-id="${booking.id}">
        <div class="request-avatar">${bookingInitials(booking.car_name)}</div>
        <div class="request-info">
          <div class="request-name">${booking.car_name || 'Vehicle'}</div>
          <div class="request-details">${start} to ${end}<br>Rs. ${total} - ${booking.status}</div>
        </div>
        <button class="request-action accept" type="button" onclick="VroomApp.viewBooking(${booking.id})">
          <i class="fas fa-check"></i>
        </button>
        <button class="request-action reject" type="button" ${canCancel ? `onclick="VroomApp.cancelBooking(${booking.id})"` : 'disabled'}>
          <i class="fas fa-times"></i>
        </button>
      </div>`;
  }

  async function cancelBooking(bookingId) {
    const token = localStorage.getItem('token');
    if (!token || !bookingId) return;

    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      alert(data.message || (res.ok ? 'Booking cancelled.' : 'Could not cancel booking.'));
      if (res.ok) window.location.reload();
    } catch (error) {
      alert('Cannot connect to backend. Make sure the server is running on port 5001.');
    }
  }

  function viewBooking(bookingId) {
    if (!bookingId) return;
    window.location.href = `/payment.html?booking_id=${encodeURIComponent(bookingId)}`;
  }

  function downloadTextFile(filename, content, type = 'text/plain') {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function saveLocalBooking(booking) {
    const nextBooking = {
      id: booking.id || `local-${Date.now()}`,
      car_name: booking.car_name || booking.name || 'Selected Vehicle',
      start_date: booking.start_date || new Date().toISOString().slice(0, 10),
      end_date: booking.end_date || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      total_price: Number(booking.total_price || booking.price || 0),
      status: booking.status || 'pending',
      payment_status: booking.payment_status || 'pending',
      local: true,
      vehicle: booking.vehicle || null,
    };

    const bookings = JSON.parse(localStorage.getItem('localBookings') || '[]');
    localStorage.setItem(
      'localBookings',
      JSON.stringify([nextBooking, ...bookings.filter(item => String(item.id) !== String(nextBooking.id))])
    );
    localStorage.setItem('currentBooking', JSON.stringify(nextBooking));
    return nextBooking;
  }

  function getBookings() {
    return JSON.parse(localStorage.getItem('localBookings') || '[]');
  }

  function enhanceVehicleDetailBundle() {
    if (!location.pathname.toLowerCase().includes('/veh%20section/') && !location.pathname.toLowerCase().includes('/veh section/')) return;

    document.querySelectorAll('.reserve-btn').forEach(button => {
      button.addEventListener('click', event => {
        event.preventDefault();
        go('/vehicles.html');
      });
    });
  }

  function enhanceSmoothExperience() {
    if (document.getElementById('vroom-smooth-experience')) return;

    const style = document.createElement('style');
    style.id = 'vroom-smooth-experience';
    style.textContent = `
      html {
        scroll-behavior: smooth;
      }

      body {
        text-rendering: optimizeLegibility;
        -webkit-font-smoothing: antialiased;
      }

      @media (prefers-reduced-motion: no-preference) {
        a,
        button,
        input,
        select,
        textarea,
        .btn,
        .card,
        .method-card,
        .vehicle-card,
        .car-card,
        .fleet-card,
        .request-item,
        .booking-card,
        .summary-box,
        .summary-panel,
        .payment-panel,
        .form-input,
        .text-input,
        .otp-input {
          transition-duration: 180ms;
          transition-timing-function: cubic-bezier(.2, .8, .2, 1);
          transition-property: transform, box-shadow, border-color, background-color, color, opacity, filter;
        }

        a,
        button,
        [role="button"],
        .method-card,
        .vehicle-card,
        .car-card,
        .fleet-card,
        .request-item {
          will-change: transform;
        }

        a:hover,
        button:hover,
        [role="button"]:hover,
        .method-card:hover,
        .vehicle-card:hover,
        .car-card:hover,
        .fleet-card:hover,
        .request-item:hover {
          transform: translateY(-1px);
        }

        button:active,
        [role="button"]:active,
        .method-card:active,
        .vehicle-card:active,
        .car-card:active,
        .fleet-card:active {
          transform: translateY(0) scale(.99);
        }

        input:focus,
        select:focus,
        textarea:focus,
        .form-input:focus,
        .text-input:focus,
        .otp-input:focus {
          transform: translateY(-1px);
        }

        body.vroom-page-ready main,
        body.vroom-page-ready .page-wrapper,
        body.vroom-page-ready .container,
        body.vroom-page-ready .dashboard,
        body.vroom-page-ready .login-container,
        body.vroom-page-ready .signup-container {
          animation: vroomPageSettle 320ms cubic-bezier(.2, .8, .2, 1) both;
        }

        [data-vroom-reveal] {
          opacity: 0;
          transform: translateY(8px);
        }

        [data-vroom-reveal].vroom-revealed {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes vroomPageSettle {
        from {
          opacity: .985;
          transform: translateY(3px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `;
    document.head.appendChild(style);

    requestAnimationFrame(() => {
      document.body.classList.add('vroom-page-ready');
    });

    const revealSelector = [
      '.card',
      '.vehicle-card',
      '.car-card',
      '.fleet-card',
      '.request-item',
      '.booking-card',
      '.summary-box',
      '.summary-panel',
      '.payment-panel',
    ].join(',');
    const revealTargets = document.querySelectorAll(revealSelector);

    if (!('IntersectionObserver' in window)) {
      revealTargets.forEach(el => el.classList.add('vroom-revealed'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('vroom-revealed');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });

    function revealElement(el, index = 0) {
      if (!el || el.dataset.vroomReveal === 'true') return;
      el.dataset.vroomReveal = 'true';
      el.style.transitionDelay = `${Math.min(index * 18, 140)}ms`;
      observer.observe(el);
    }

    revealTargets.forEach((el, index) => {
      revealElement(el, index);
    });

    const mutationObserver = new MutationObserver((mutations) => {
      let index = 0;
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (!(node instanceof Element)) return;
          if (node.matches(revealSelector)) revealElement(node, index++);
          node.querySelectorAll?.(revealSelector).forEach(child => revealElement(child, index++));
        });
      });
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });
  }

  document.addEventListener('DOMContentLoaded', () => {
    enhanceSmoothExperience();
    enhanceLinks();
    enhanceLogoLinks();
    enhanceAuthButtons();
    hydrateCustomerDashboard();
    enhanceVehicleDetailBundle();
  });

  window.VroomApp = {
    routes,
    go,
    saveLocalBooking,
    getBookings,
    downloadTextFile,
    cancelBooking,
    viewBooking,
  };
})();
