// Calendar Generation and Management
document.addEventListener('DOMContentLoaded', function() {
    const calendarDaysContainer = document.getElementById('calendarDays');
    const calendarMonthSpan = document.querySelector('.calendar-month');
    const calendarNavs = document.querySelectorAll('.calendar-nav');
    
    let currentDate = new Date(2025, 9, 1); // October 2025
    let selectedStart = new Date(2025, 9, 12); // Oct 12
    let selectedEnd = new Date(2025, 9, 15); // Oct 15
    
    function generateCalendar() {
        calendarDaysContainer.innerHTML = '';
        
        // Get first day of month and number of days
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // Update month display
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December'];
        calendarMonthSpan.textContent = `${monthNames[month]} ${year}`;
        
        // Add empty cells for days before month starts
        for (let i = 0; i < firstDay; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day empty';
            calendarDaysContainer.appendChild(emptyDay);
        }
        
        // Add days of month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            const dayDate = new Date(year, month, day);
            
            dayElement.className = 'calendar-day';
            dayElement.textContent = day;
            
            // Check if date is selected start or end
            if (dayDate.toDateString() === selectedStart.toDateString()) {
                dayElement.classList.add('selected');
            } else if (dayDate.toDateString() === selectedEnd.toDateString()) {
                dayElement.classList.add('selected');
            } else if (dayDate > selectedStart && dayDate < selectedEnd) {
                dayElement.classList.add('range');
            }
            
            dayElement.addEventListener('click', () => {
                selectDate(dayDate);
            });
            
            calendarDaysContainer.appendChild(dayElement);
        }
    }
    
    function selectDate(date) {
        if (selectedStart > selectedEnd) {
            [selectedStart, selectedEnd] = [selectedEnd, selectedStart];
        }
        
        if (date < selectedStart || (date > selectedStart && date > selectedEnd)) {
            selectedStart = date;
            selectedEnd = new Date(date.getTime() + 24 * 60 * 60 * 1000);
        } else if (date > selectedStart && date < selectedEnd) {
            selectedEnd = date;
        } else if (date.getTime() === selectedStart.getTime()) {
            selectedStart = new Date(date.getTime() + 24 * 60 * 60 * 1000);
        }
        
        updateDateInputs();
        generateCalendar();
    }
    
    function updateDateInputs() {
        const checkInInput = document.querySelector('.date-inputs .date-input:first-child input');
        const checkOutInput = document.querySelector('.date-inputs .date-input:last-child input');
        
        checkInInput.value = formatDateForInput(selectedStart);
        checkOutInput.value = formatDateForInput(selectedEnd);
        
        updatePricingBreakdown();
    }
    
    function formatDateForInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    function updatePricingBreakdown() {
        const daysCount = Math.ceil((selectedEnd - selectedStart) / (1000 * 60 * 60 * 24));
        const pricePerDay = 2449;
        const subtotal = daysCount * pricePerDay;
        const insurance = 800;
        const serviceFee = 485;
        const total = subtotal + insurance + serviceFee;
        
        const breakdownItems = document.querySelectorAll('.breakdown-item');
        if (breakdownItems.length >= 4) {
            breakdownItems[0].innerHTML = `<span>${daysCount} days x Rs. ${pricePerDay.toLocaleString()}.00</span><span>Rs. ${subtotal.toLocaleString()}.00</span>`;
            breakdownItems[3].innerHTML = `<span>TOTAL</span><span>Rs. ${total.toLocaleString()}.00</span>`;
        }
    }
    
    // Calendar navigation
    calendarNavs[0].addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        generateCalendar();
    });
    
    calendarNavs[1].addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        generateCalendar();
    });
    
    // Initialize
    generateCalendar();
    updateDateInputs();
    
    // Date input change handlers
    const dateInputs = document.querySelectorAll('.date-input input');
    dateInputs[0].addEventListener('change', (e) => {
        selectedStart = new Date(e.target.value);
        generateCalendar();
        updatePricingBreakdown();
    });
    
    dateInputs[1].addEventListener('change', (e) => {
        selectedEnd = new Date(e.target.value);
        generateCalendar();
        updatePricingBreakdown();
    });
});

// Thumbnail Image Selection
document.addEventListener('DOMContentLoaded', function() {
    const thumbnails = document.querySelectorAll('.thumbnail');
    
    thumbnails.forEach(thumbnail => {
        thumbnail.addEventListener('click', function() {
            thumbnails.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // You can add image loading logic here
            console.log('Selected thumbnail:', this.textContent);
        });
    });
});

// Menu Active State
document.addEventListener('DOMContentLoaded', function() {
    const menuItems = document.querySelectorAll('.menu-item');
    
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            menuItems.forEach(m => m.classList.remove('active'));
            this.classList.add('active');
        });
    });
});

// Reserve Button Interaction
document.addEventListener('DOMContentLoaded', function() {
    const reserveBtn = document.querySelector('.reserve-btn');
    
    reserveBtn.addEventListener('click', function() {
        const checkInInput = document.querySelector('.date-inputs .date-input:first-child input');
        const checkOutInput = document.querySelector('.date-inputs .date-input:last-child input');
        
        const checkIn = checkInInput.value;
        const checkOut = checkOutInput.value;
        
        localStorage.setItem('selectedVehicle', JSON.stringify({
            id: 'veh-section-porsche',
            name: 'Porsche 911 GT3 RS',
            category: 'Car',
            price: 2449,
            image_url: 'veh section/Porsche.jpg',
            specs: ['Petrol', 'PDK 7-Speed'],
        }));
        localStorage.setItem('bookingDraft', JSON.stringify({
            id: `local-${Date.now()}`,
            car_name: 'Porsche 911 GT3 RS',
            start_date: checkIn,
            end_date: checkOut,
            total_price: 2449,
            status: 'pending',
            local: true,
        }));
        window.location.href = '/payment.html';
    });
});

// Smooth scroll for reviews
document.addEventListener('DOMContentLoaded', function() {
    const loadMoreBtn = document.querySelector('.load-more');
    
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', function() {
            // Simulate loading more reviews
            const reviewsSection = document.querySelector('.reviews-section');
            const newReview = document.createElement('div');
            newReview.className = 'review-item';
            newReview.innerHTML = `
                <div class="review-header">
                    <div class="reviewer-info">
                        <span class="reviewer-avatar">MJ</span>
                        <div>
                            <p class="reviewer-name">Michael J.</p>
                            <p class="review-date">February 2024</p>
                        </div>
                    </div>
                    <span class="review-rating">★★★★★</span>
                </div>
                <p class="review-text">"Absolutely fantastic experience! The car was immaculate and the service was top-notch. Will definitely rent from Julien again!"</p>
            `;
            reviewsSection.insertBefore(newReview, loadMoreBtn);
        });
    }
});

// Add smooth animations on scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

document.addEventListener('DOMContentLoaded', function() {
    const elementsToObserve = document.querySelectorAll(
        '.spec-item, .review-item, .manager-section'
    );
    
    elementsToObserve.forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(10px)';
        element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(element);
    });
});

// Message Owner functionality
document.addEventListener('DOMContentLoaded', function() {
    const messageOwnerBtn = document.querySelector('.message-owner');
    
    if (messageOwnerBtn) {
        messageOwnerBtn.addEventListener('click', function(e) {
            e.preventDefault();
            alert('Opening message interface with Julien Vance...');
            // Implement modal or chat interface here
        });
    }
});

// Add hover effects to interactive elements
document.addEventListener('DOMContentLoaded', function() {
    const interactiveElements = document.querySelectorAll(
        '.menu-item, .spec-item, .review-item, .reserve-btn, .calendar-nav, .message-owner'
    );
    
    interactiveElements.forEach(element => {
        element.addEventListener('mouseenter', function() {
            if (this.classList.contains('reserve-btn')) {
                this.style.transform = 'translateY(-2px)';
            }
        });
        
        element.addEventListener('mouseleave', function() {
            if (this.classList.contains('reserve-btn')) {
                this.style.transform = 'translateY(0)';
            }
        });
    });
});

// Format currency display
function formatCurrency(amount) {
    return 'Rs. ' + amount.toLocaleString('en-IN');
}

// Calendar keyboard navigation
document.addEventListener('DOMContentLoaded', function() {
    const calendarDaysContainer = document.getElementById('calendarDays');
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            const navButtons = document.querySelectorAll('.calendar-nav');
            if (e.key === 'ArrowLeft') {
                navButtons[0].click();
            } else {
                navButtons[1].click();
            }
        }
    });
});







//(Optional but recommended) Click thumbnail → change main image

//Add this JS:
// const mainImage = document.querySelector('.car-image-container img');
//const thumbnails = document.querySelectorAll('.thumbnail img');

//thumbnails.forEach(img => {
    //img.addEventListener('click', function () {
        mainImage.src = this.src;
    //});
//});
