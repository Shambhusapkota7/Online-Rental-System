const fallbackVehicles = [
  {
    id: "local-car",
    name: "Mercedes AMG GT-R",
    brand: "Mercedes",
    model: "Sport Sedan",
    year: 2024,
    price_per_day: 28000,
    availability: true,
    image: "/image/car.img.jpg",
  },
  {
    id: "local-bike",
    name: "Duke 200",
    brand: "KTM",
    model: "Sports Naked Bike",
    year: 2024,
    price_per_day: 2200,
    availability: true,
    image: "/image/bike.img.jpg",
  },
  {
    id: "local-bus",
    name: "Deluxe Night Bus",
    brand: "Volvo",
    model: "7900 Electric",
    year: 2024,
    price_per_day: 15000,
    availability: true,
    image: "/image/bus.img.jpg",
  },
];

const carsContainer = document.getElementById("carsContainer");
const fleetStatus = document.getElementById("fleetStatus");
const landingBookNow = document.getElementById("landingBookNow");
const landingLoginCta = document.getElementById("landingLoginCta");

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch (error) {
    return null;
  }
}

function getBookingEntryPath() {
  const token = localStorage.getItem("token");
  const user = getStoredUser();

  if (!token || !user) return "/login.html?role=user";
  if (user.role === "vendor" || user.role === "admin") return "/login.html?role=user";
  return "/vehicleListing.html";
}

function bindLandingCtas() {
  if (landingBookNow) {
    landingBookNow.addEventListener("click", (event) => {
      event.preventDefault();
      window.location.href = getBookingEntryPath();
    });
  }

  if (landingLoginCta) {
    landingLoginCta.addEventListener("click", (event) => {
      event.preventDefault();
      window.location.href = "/login.html?role=user";
    });
  }
}

function normalizeVehicle(car) {
  return {
    id: car.id,
    name: car.name || [car.brand, car.model].filter(Boolean).join(" ") || "Vehicle",
    brand: car.brand || "Vroom",
    model: car.model || "Rental",
    year: car.year || "Available",
    price: Number(car.price_per_day || car.price || 0),
    availability: car.availability === true || car.availability === 1 || car.availability === "1",
    image: car.image || car.image_url || "/image/car.img.jpg",
  };
}

function renderVehicles(cars, sourceLabel) {
  const vehicles = cars.map(normalizeVehicle).slice(0, 8);
  fleetStatus.textContent = sourceLabel;

  carsContainer.innerHTML = vehicles.map((vehicle, index) => `
    <article class="car-card">
      <div class="tag">${vehicle.availability ? "Available" : "Limited"}</div>
      <img src="${vehicle.image}" alt="${vehicle.name}" loading="lazy">
      <div class="car-info">
        <h3>${vehicle.name}</h3>
        <div class="car-details">
          <span>${vehicle.brand}</span>
          <span>${vehicle.model}</span>
          <span>${vehicle.year}</span>
        </div>
        <div class="price-row">
          <strong>${vehicle.price ? `Rs. ${vehicle.price.toLocaleString("en-IN")}/day` : "Price on request"}</strong>
          <a href="/vehicles.html${vehicle.id ? `?car_id=${encodeURIComponent(vehicle.id)}` : ""}" data-index="${index}">Rent Now</a>
        </div>
      </div>
    </article>
  `).join("");

  carsContainer.querySelectorAll(".price-row a").forEach((link) => {
    link.addEventListener("click", () => {
      const vehicle = vehicles[Number(link.dataset.index)];
      localStorage.setItem("selectedVehicle", JSON.stringify({
        id: vehicle.id,
        name: vehicle.name,
        category: [vehicle.brand, vehicle.model].filter(Boolean).join(" / "),
        year: vehicle.year,
        price: vehicle.price,
        image_url: vehicle.image,
        availability: vehicle.availability,
      }));
    });
  });
}

async function loadVehicles() {
  try {
    const response = await fetch("/api/cars?available=true");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const cars = Array.isArray(data) ? data : data.cars || [];
    renderVehicles(cars.length ? cars : fallbackVehicles, cars.length ? "Live vehicles from backend." : "Showing sample vehicles.");
  } catch (error) {
    renderVehicles(fallbackVehicles, "Showing saved vehicles until the database is available.");
  }
}

document.getElementById("next").addEventListener("click", () => {
  carsContainer.scrollBy({ left: 340, behavior: "smooth" });
});

document.getElementById("prev").addEventListener("click", () => {
  carsContainer.scrollBy({ left: -340, behavior: "smooth" });
});

document.getElementById("landingSearch").addEventListener("submit", (event) => {
  event.preventDefault();

  const location = document.getElementById("pickupLocation").value.trim();
  const date = document.getElementById("pickupDate").value;

  localStorage.setItem("rentalSearch", JSON.stringify({ location, date }));

  const params = new URLSearchParams();
  if (location) params.set("q", location);
  if (date) params.set("date", date);

  window.location.href = `/vehicleListing.html${params.toString() ? `?${params}` : ""}`;
});

loadVehicles();
bindLandingCtas();
