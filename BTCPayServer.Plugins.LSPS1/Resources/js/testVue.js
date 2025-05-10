
console.log('Loading testVue.js...');

Vue.component('test-component', {
    template: `
        <div class="test-component">
            <h3>{{ title }}</h3>
            <p>Counter: {{ counter }}</p>
            <button class="btn btn-primary" @click="incrementCounter">Increment</button>
        </div>
    `,
    data() {
        return {
            title: 'Vue Test Component',
            counter: 0
        }
    },
    methods: {
        incrementCounter() {
            this.counter++;
            console.log('Counter incremented to:', this.counter);
        }
    },
    mounted() {
        console.log('Test Vue component mounted successfully!');
    }
});

// Initialize a Vue instance when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    const app = new Vue({
        el: '#test-vue-app',
        mounted() {
            console.log('Vue app initialized');
        }
    });
});