
const qs = (sel, el = document) => el.querySelector(sel);
const qsa = (sel, el = document) => Array.from(el.querySelectorAll(sel));
const isFiniteNumber = v => Number.isFinite(v) && v > 0;


const form = qs('.form');
const inputType = qs('.form__input--type');
const inputDistance = qs('.form__input--distance');
const inputDuration = qs('.form__input--duration');
const inputCadence = qs('.form__input--cadence');
const inputElevation = qs('.form__input--elevation');
const workoutsContainer = qs('.workouts');


class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);

  constructor(coords, type, distance, duration) {
    this.coords = coords;      
    this.type = type;           
    this.distance = +distance;  
    this.duration = +duration;  
  }

  _setDescription() {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    this.description = `${this.type[0].toUpperCase()+this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  constructor(coords, distance, duration, cadence) {
    super(coords, 'running', distance, duration);
    this.cadence = +cadence;
    this.pace = this.duration / this.distance; 
    this._setDescription();
  }
}

class Cycling extends Workout {
  constructor(coords, distance, duration, elevationGain) {
    super(coords, 'cycling', distance, duration);
    this.elevationGain = +elevationGain;
    this.speed = this.distance / (this.duration / 60);
    this._setDescription();
  }
}


class App {
  #map;
  #mapEvent;
  #workouts = [];
  #mapZoom = 13;
  #markers = new Map();

  constructor() {
   
    this._getPosition();
    this._getLocalStorage();

    
    qs('.form__btn').addEventListener('click', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField.bind(this));
    workoutsContainer.addEventListener('click', this._onWorkoutClick.bind(this));
  }

  _getPosition() {
   
    const defaultCoords = [28.6139, 77.2090]; 
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => this._loadMap([pos.coords.latitude, pos.coords.longitude]),
        () => this._loadMap(defaultCoords)
      );
    } else {
      this._loadMap(defaultCoords);
    }
  }

  _loadMap(coords) {
    this.#map = L.map('map').setView(coords, this.#mapZoom);

   
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));

    
    this.#workouts.forEach(w => this._renderWorkoutMarker(w));
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');

    
    setTimeout(() => inputDistance.focus(), 80);
  }

  _hideForm() {
   
    inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';
    form.classList.add('hidden');
  }

  _toggleElevationField() {
    const isRunning = inputType.value === 'running';
    
    document.querySelector('.form__row--hidden').classList.toggle('hidden', isRunning);
    document.querySelector('.form__input--cadence').closest('.form__row').classList.toggle('hidden', !isRunning);
  }

  _newWorkout(e) {
    e.preventDefault();
   
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;

    if (!isFiniteNumber(distance) || !isFiniteNumber(duration)) {
      alert('Distance and duration must be positive numbers.');
      return;
    }

    let workout;
    if (type === 'running') {
      const cadence = +inputCadence.value;
      if (!isFiniteNumber(cadence)) {
        alert('Cadence must be a positive number.');
        return;
      }
      workout = new Running([lat, lng], distance, duration, cadence);
    } else if (type === 'cycling') {
      const elevation = +inputElevation.value || 0;
      
      if (!Number.isFinite(elevation)) {
        alert('Elevation must be a number.');
        return;
      }
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

 
    this.#workouts.push(workout);
    this._setLocalStorage();

   
    this._renderWorkoutMarker(workout);
    this._renderWorkout(workout);

   
    this._hideForm();
  }

  _renderWorkoutMarker(workout) {
    const marker = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 120,
          autoClose: false,
          closeOnClick: false,
          className: `workout-popup workout-popup--${workout.type}`
        })
      )
      .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`)
      .openPopup();

    this.#markers.set(workout.id, marker);
  }

  _renderWorkout(workout) {
    const html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div>
          <span class="workout__details"><span class="workout__icon">📏</span><span class="workout__value">${workout.distance}</span> <span class="workout__unit">km</span></span>
          <span class="workout__details"><span class="workout__icon">⏱</span><span class="workout__value">${workout.duration}</span> <span class="workout__unit">min</span></span>
          ${workout.type === 'running'
            ? `<span class="workout__details"><span class="workout__icon">⚡️</span><span class="workout__value">${(workout.pace).toFixed(2)}</span> <span class="workout__unit">min/km</span></span>
               <span class="workout__details"><span class="workout__icon">🦶🏼</span><span class="workout__value">${workout.cadence}</span> <span class="workout__unit">spm</span></span>`
            : `<span class="workout__details"><span class="workout__icon">⚡️</span><span class="workout__value">${(workout.speed).toFixed(1)}</span> <span class="workout__unit">km/h</span></span>
               <span class="workout__details"><span class="workout__icon">⛰</span><span class="workout__value">${workout.elevationGain}</span> <span class="workout__unit">m</span></span>`
          }
        </div>
      </li>
    `;
    workoutsContainer.insertAdjacentHTML('beforeend', html);
  }

  _onWorkoutClick(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;
    const id = workoutEl.dataset.id;
    const workout = this.#workouts.find(w => w.id === id);
    if (!workout) return;
    const marker = this.#markers.get(id);
    if (marker) {
      this.#map.setView(workout.coords, this.#mapZoom, {
        animate: true,
        pan: { duration: 1 }
      });
      marker.openPopup();
    }
  }

  _setLocalStorage() {
    localStorage.setItem('mapty_workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('mapty_workouts') || 'null');
    if (!data) return;
    
    this.#workouts = data.map(d => {
      if (d.type === 'running') {
        const run = new Running(d.coords, d.distance, d.duration, d.cadence);
        run.id = d.id; run.date = new Date(d.date); run.description = d.description;
        return run;
      } else {
        const cyc = new Cycling(d.coords, d.distance, d.duration, d.elevationGain);
        cyc.id = d.id; cyc.date = new Date(d.date); cyc.description = d.description;
        return cyc;
      }
    });

    
    this.#workouts.forEach(w => this._renderWorkout(w));
  }


  reset() {
    localStorage.removeItem('mapty_workouts');
    location.reload();
  }
}


const app = new App();


