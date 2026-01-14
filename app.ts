// Kanban Board To-Do Application
interface Task {
    id: number;
    text: string;
    emoji: string;
    status: 'not-started' | 'in-progress' | 'done';
    createdAt: Date;
}

class TodoApp {
    private tasks: Task[] = [];
    private currentStatus: 'not-started' | 'in-progress' | 'done' = 'not-started';
    private editingTaskId: number | null = null;
    private modal!: HTMLElement;
    private taskInput!: HTMLInputElement;
    private taskEmoji!: HTMLInputElement;
    private modalTitle!: HTMLElement;

    constructor() {
        this.loadFromStorage();
        this.initializeElements();
        this.render();
    }

    // Initialize DOM elements
    private initializeElements(): void {
        this.modal = document.getElementById('taskModal')!;
        this.taskInput = document.getElementById('taskInput') as HTMLInputElement;
        this.taskEmoji = document.getElementById('taskEmoji') as HTMLInputElement;
        this.modalTitle = document.getElementById('modalTitle')!;
    }

    // Add a new task
    public addNewTask(status: 'not-started' | 'in-progress' | 'done'): void {
        this.currentStatus = status;
        this.editingTaskId = null;
        this.taskInput.value = '';
        this.taskEmoji.value = '';
        this.modalTitle.textContent = 'Add New Task';
        this.modal.classList.add('active');
        this.taskInput.focus();
    }

    // Edit a task
    public editTask(id: number): void {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            this.editingTaskId = id;
            this.currentStatus = task.status;
            this.taskInput.value = task.text;
            this.taskEmoji.value = task.emoji;
            this.modalTitle.textContent = 'Edit Task';
            this.modal.classList.add('active');
            this.taskInput.focus();
        }
    }

    // Save task (add or edit)
    public saveTask(): void {
        const text = this.taskInput.value.trim();
        
        if (!text) {
            alert('Please enter a task name!');
            return;
        }

        if (this.editingTaskId !== null) {
            // Edit existing task
            const task = this.tasks.find(t => t.id === this.editingTaskId);
            if (task) {
                task.text = text;
                task.emoji = this.taskEmoji.value.trim();
            }
        } else {
            // Add new task
            const task: Task = {
                id: Date.now(),
                text: text,
                emoji: this.taskEmoji.value.trim() || '📝',
                status: this.currentStatus,
                createdAt: new Date()
            };
            this.tasks.push(task);
        }

        this.saveToStorage();
        this.render();
        this.closeModal();
    }

    // Move task to different status
    public moveTask(id: number, newStatus: 'not-started' | 'in-progress' | 'done'): void {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.status = newStatus;
            this.saveToStorage();
            this.render();
        }
    }

    // Delete a task
    public deleteTask(id: number): void {
        if (confirm('Delete this task?')) {
            this.tasks = this.tasks.filter(t => t.id !== id);
            this.saveToStorage();
            this.render();
        }
    }

    // Close modal
    public closeModal(): void {
        this.modal.classList.remove('active');
        this.editingTaskId = null;
    }

    // Get tasks by status
    private getTasksByStatus(status: 'not-started' | 'in-progress' | 'done'): Task[] {
        return this.tasks.filter(t => t.status === status);
    }

    // Update counts
    private updateCounts(): void {
        const notStartedCount = this.getTasksByStatus('not-started').length;
        const inProgressCount = this.getTasksByStatus('in-progress').length;
        const doneCount = this.getTasksByStatus('done').length;

        document.getElementById('notStartedCount')!.textContent = notStartedCount.toString();
        document.getElementById('inProgressCount')!.textContent = inProgressCount.toString();
        document.getElementById('doneCount')!.textContent = doneCount.toString();
    }

    // Render a single card
    private renderCard(task: Task): string {
        const otherStatuses = ['not-started', 'in-progress', 'done'].filter(s => s !== task.status);
        
        return `
            <div class="task-card" ondblclick="app.editTask(${task.id})">
                <span class="task-emoji">${this.escapeHtml(task.emoji)}</span>
                <span class="task-text">${this.escapeHtml(task.text)}</span>
                <div class="task-actions">
                    <button class="action-btn" onclick="app.moveTask(${task.id}, '${otherStatuses[0]}')" title="Move to ${otherStatuses[0].replace('-', ' ')}">
                        ${this.getStatusIcon(otherStatuses[0])}
                    </button>
                    <button class="action-btn" onclick="app.moveTask(${task.id}, '${otherStatuses[1]}')" title="Move to ${otherStatuses[1].replace('-', ' ')}">
                        ${this.getStatusIcon(otherStatuses[1])}
                    </button>
                    <button class="action-btn delete-btn" onclick="app.deleteTask(${task.id})" title="Delete">
                        ✕
                    </button>
                </div>
            </div>
        `;
    }

    // Get status icon
    private getStatusIcon(status: string): string {
        switch (status) {
            case 'not-started': return '○';
            case 'in-progress': return '◐';
            case 'done': return '●';
            default: return '○';
        }
    }

    // Render all cards
    private render(): void {
        const statuses: ('not-started' | 'in-progress' | 'done')[] = ['not-started', 'in-progress', 'done'];
        
        statuses.forEach(status => {
            const container = document.getElementById(`${status === 'not-started' ? 'notStarted' : status === 'in-progress' ? 'inProgress' : 'done'}Cards`);
            if (container) {
                const tasks = this.getTasksByStatus(status);
                container.innerHTML = tasks.map(task => this.renderCard(task)).join('');
            }
        });

        this.updateCounts();
    }

    // Escape HTML special characters
    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Save tasks to localStorage
    private saveToStorage(): void {
        localStorage.setItem('kanban-tasks', JSON.stringify(this.tasks));
    }

    // Load tasks from localStorage
    private loadFromStorage(): void {
        const stored = localStorage.getItem('kanban-tasks');
        this.tasks = stored ? JSON.parse(stored) : [];
    }
}

// Initialize the app when DOM is ready
let app: TodoApp;
document.addEventListener('DOMContentLoaded', () => {
    app = new TodoApp();
    
    // Close modal on escape key
    document.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            app.closeModal();
        }
    });
    
    // Close modal when clicking outside
    document.getElementById('taskModal')?.addEventListener('click', (e: MouseEvent) => {
        if (e.target === document.getElementById('taskModal')) {
            app.closeModal();
        }
    });
    
    // Submit on Enter key
    document.getElementById('taskInput')?.addEventListener('keypress', (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
            app.saveTask();
        }
    });
});

    export {};

/*

                              ::::::::::::::::::::                              
                        -::::::::::::::::::::::::::::::-                        
                     ::::::::::::::::::::::::::::::::::::::-                    
                  :::::-+%@@+::::::::::::::::::::::-%#+-::::::-                 
               :::::=%@@@@@@@-:::::::::::::::::::::%@@@@@%=:::::-               
             :::::#@@@@@@@@#::::-*%@@@@@@@@@@@*-:::*@@@@@@@@@=::::-             
           ::::-%@@@@@@@@=:::*@@@@@@@@@@@@@@@@@@@@*:::#@@@@@@@@+::::-           
         :::::#@@@@@@@@+::-%@@@@@@@@@@@@@@@@@@@@@@@@%-:-#@@@@@@@@+::::=         
        ::::+@@@@@@@@%-:-%@@@@@@@@@@@@@@@@@@@@@@@@@@@@%-:=%@@@@@@@%-:::-        
       ::::*@@@@@@@@*::+@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@+::#@@@@@@@@+::::+      
     ::::-%@@@@@@@@*::*@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@*::%@@@@@@@@#::::=     
    :::::%@@@@@@@@#::+@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@+::#@@@@@@@@#::::=    
    ::::%@@@@@@@@@-:=@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@=:=@@@@@@@@@#::::@   
   ::::*@@@@@@@@@*::*@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@#::*@@@@@@@@@+::::+  
  ::::+@@@@@@@@@@-::%@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%::-@@@@@@@@@@=:::-  
 :::::%@@@@@@@@@%-::@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@-::%@@@@@@@@@#::::+ 
 ::::+@@@@@@@@@@%-::@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@:::%@@@@@@@@@@=:::: 
:::::@@@@@@@@@@@%-::%@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%:::%@@@@@@@@@@%::::-
::::=@@@@@@@@@@@@-::*@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@#::-%@@@@@@@@@@@=:::=
::::+@@@@@@@@@@@@*::=@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@=::+@@@@@@@@@@@@*:::=
::::*@@@@@@@@@@@@@-::+@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@+:::%@@@@@@@@@@@@#:::-
::::#@@@@@@@@@@@@@*:::*@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@*:::+@@@@@@@@@@@@@#::::
::::#@@@@@@@@@@@@@@=:::=@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@+::::%@@@@@@@@@@@@@#::::
::::*@@@@@@@@@@@@@@@-::::#@@@@@@@@@@@@@@@@@@@@@@@@@@@@%:::::%@@@@@@@@@@@@@@#:::-
::::+@@@@@@@@@@@@%-:::::::-%@@@@@@@@@@@@@@@@@@@@@@@@%-:::::::*@@@@@@@@@@@@@*:::-
::::=@@@@@@@@@%=:::::::::::::+@@@@@@@@@@@@@@@@@@@@@@@%-::::::::-#@@@@@@@@@@+:::=
:::::%@@@@@@+:::::::::::::::::::-+%@@@@@@@@@@%+-:=%@@@@%-:::::::::=%@@@@@@@::::=
 ::::-%@@#-::::::::::::::::::::::::::::::::::::::::=%@@@@%+:::::::::-+%@@@+::::# 
 -::::==::::::::::::-#-::::::::::::::::::::::::::::::-#@@@@@*::::::::::-##::::+ 
  ::::::::::::::::=@@@@@#-::::::::::::::::::::::::::::::*@@@@@#-:::::::::::::-  
   :::::::::::::*@@@@@@@@@@@*-:::::::::::::::::::=*:::::::+%@@@@%-:::::::::::*  
    :::::::::-%@@@@@*::+%@@@@@@@@%#+-:::::-=*%%@@@@@#:::::::-%@@@@%=::::::::%   
    -::::::+%@@@@%=:::::::-+%@@@@@@@@@@@@@@@@@@@@@%=::::::::::-#@@@@@*:::::=    
     -:::*@@@@@#-::::::::::::::-=+#%@@@@@@@%#*=-:::::::::::::::#@@@@*:::::+     
      -*@@@@@*::::::::::::::::::::::::::::::::::::::::::::::-#@@@@%-::::-*      
        #@%=:::::::::--:::::::::::::::::::::::::::::::::::=%@@@@%=:::::-        
         :::::::::::#@@@#-:::::::::::::::::::::::::::::=%@@@@@%=::::::+         
           -:::::::=@@@@@@@@%+:::::::::::::::::::::+%@@@@@@@%-::::::=           
             :::::::::=%@@@@@@@@@%%%#**+++**#%%%@@@@@@@@@%=:::::::=             
               -::::::::::=*%@@@@@@@@@@@@@@@@@@@@@@@@%+-::::::::=               
                 =:::::::::::::-=+*#%%@@@@@@%%#*+=-::::::::::-+                 
                    =-::::::::::::::::::::::::::::::::::::-+                    
                        =-::::::::::::::::::::::::::::-*                        
                              +-::::::::::::::::-+                              

*/
