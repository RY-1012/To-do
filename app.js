// Kanban Board To-Do Application (Backend Version)
// Configured via To-Do/config.js
const API_URL = window.TODO_API_URL || 'http://localhost:5000/api';

class TodoApp {
    constructor() {
        this.tasks = [];
        this.groups = [];
        this.currentStatus = 'not-started';
        this.currentGroup = null;
        this.editingTaskId = null;
        this.token = localStorage.getItem('token');
        this.user = JSON.parse(localStorage.getItem('user') || '{}');

        // Workflow-specific properties
        this.workflowTasks = [];
        this.connections = [];
        this.currentView = 'board';
        this.connectionMode = false;
        this.connectionSource = null;
        this.draggedTask = null;
        this.editingWorkflowTaskId = null;

        // Redirect to login if no token
        if (!this.token) {
            window.location.href = 'login.html';
            return;
        }

        this.initializeElements();
        this.loadTasks();
        this.initializeWorkflowEventListeners();
    }

    // Initialize DOM elements
    initializeElements() {
        this.modal = document.getElementById('taskModal');
        this.taskInput = document.getElementById('taskInput');
        this.taskEmoji = document.getElementById('taskEmoji');
        this.modalTitle = document.getElementById('modalTitle');
        this.groupSelect = document.getElementById('groupSelect');
        this.newGroupBtn = document.getElementById('newGroupBtn');
        this.newGroupInput = document.getElementById('newGroupInput');
        this.newGroupName = document.getElementById('newGroupName');
        this.groupModal = document.getElementById('groupModal');
        this.groupInput = document.getElementById('groupInput');

        // Initialize profile display
        this.updateProfileDisplay();
    }

    // Update profile display
    updateProfileDisplay() {
        const profileSection = document.getElementById('profileSection');
        const signinPrompt = document.getElementById('signinPrompt');
        
        if (this.user && this.user.username) {
            // User is logged in - show profile
            profileSection.style.display = 'block';
            signinPrompt.style.display = 'none';
            
            // Update profile info
            const profileName = document.getElementById('profileName');
            const profileEmail = document.getElementById('profileEmail');
            const profileAvatar = document.getElementById('profileAvatar');
            
            profileName.textContent = this.user.username;
            profileEmail.textContent = this.user.email || '—';
            
            // Set avatar initial (first letter of username)
            const initial = this.user.username.charAt(0).toUpperCase();
            profileAvatar.textContent = initial;
        } else {
            // User is not logged in - show sign in prompt
            profileSection.style.display = 'none';
            signinPrompt.style.display = 'block';
        }
    }

    // Load tasks from backend
    async loadTasks() {
        try {
            const [tasksRes, workflowRes] = await Promise.all([
                fetch(`${API_URL}/tasks`, {
                    headers: { 'Authorization': `Bearer ${this.token}` }
                }),
                fetch(`${API_URL}/workflow`, {
                    headers: { 'Authorization': `Bearer ${this.token}` }
                })
            ]);

            if (tasksRes.status === 401 || workflowRes.status === 401) {
                this.logout();
                return;
            }

            if (tasksRes.ok) {
                this.tasks = await tasksRes.json();
                this.extractGroups();
            }
            
            if (workflowRes.ok) {
                const workflowData = await workflowRes.json();
                this.workflowTasks = workflowData.tasks || [];
                this.connections = workflowData.connections || [];
            }
            
            this.render();
            if (this.currentView === 'workflow') {
                this.renderWorkflowCanvas();
            }
        } catch (err) {
            console.error('Error loading data:', err);
            alert('Failed to load data. Check backend connection.');
        }
    }

    // Save workflow to storage
    async saveToStorage() {
        try {
            await fetch(`${API_URL}/workflow`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({
                    tasks: this.workflowTasks,
                    connections: this.connections
                })
            });
        } catch (err) {
            console.error('Error saving workflow:', err);
        }
    }

    // Load tasks from storage (No-op in backend mode as we use loadTasks)
    loadFromStorage() {
        // Data is loaded via loadTasks() from server
    }

    // Extract unique groups from tasks
    extractGroups() {
        const groupSet = new Set();
        this.tasks.forEach(task => {
            if (task.group) groupSet.add(task.group);
        });
        this.groups = Array.from(groupSet);
    }

    // Add a new task
    addNewTask(status, group = null) {
        this.currentStatus = status;
        this.currentGroup = group;
        this.editingTaskId = null;
        this.taskInput.value = '';
        this.taskEmoji.value = '';
        this.modalTitle.textContent = 'Add New Task';
        this.updateGroupSelect();
        if (group) {
            this.groupSelect.value = group;
        } else {
            this.groupSelect.value = '';
        }
        this.hideNewGroupInput();
        this.modal.classList.add('active');
        this.taskInput.focus();
    }

    // Update group select dropdown
    updateGroupSelect() {
        this.groupSelect.innerHTML = '<option value="">No Group</option>';
        this.groups.forEach(group => {
            const option = document.createElement('option');
            option.value = group;
            option.textContent = group;
            this.groupSelect.appendChild(option);
        });
    }

    // Show new group input
    showNewGroupInput() {
        this.newGroupInput.style.display = 'block';
        this.newGroupName.focus();
    }

    // Hide new group input
    hideNewGroupInput() {
        this.newGroupInput.style.display = 'none';
        this.newGroupName.value = '';
    }

    // Create new group
    createNewGroup() {
        const groupName = this.newGroupName.value.trim();

        if (!groupName) {
            alert('Please enter a group name!');
            return;
        }

        if (!this.groups.includes(groupName)) {
            this.groups.push(groupName);
            this.updateGroupSelect();
            this.groupSelect.value = groupName;
            this.hideNewGroupInput();
        } else {
            alert('This group already exists!');
        }
    }

    // Edit a task
    editTask(id) {
        const task = this.tasks.find(t => t._id === id);
        if (task) {
            this.editingTaskId = id;
            this.currentStatus = task.status;
            this.currentGroup = task.group;
            this.taskInput.value = task.text;
            this.taskEmoji.value = task.emoji;
            this.modalTitle.textContent = 'Edit Task';
            this.updateGroupSelect();
            if (task.group) {
                this.groupSelect.value = task.group;
            } else {
                this.groupSelect.value = '';
            }
            this.hideNewGroupInput();
            this.modal.classList.add('active');
            this.taskInput.focus();
        }
    }

    // Save task (add or edit)
    async saveTask() {
        const text = this.taskInput.value.trim();
        const groupValue = this.groupSelect.value || null;

        if (!text) {
            alert('Please enter a task name!');
            return;
        }

        try {
            if (this.editingTaskId !== null) {
                // Edit existing task
                const response = await fetch(`${API_URL}/tasks/${this.editingTaskId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.token}`
                    },
                    body: JSON.stringify({
                        text,
                        emoji: this.taskEmoji.value.trim(),
                        status: this.currentStatus,
                        group: groupValue
                    })
                });

                if (response.ok) {
                    this.loadTasks();
                } else {
                    alert('Failed to update task');
                }
            } else {
                // Add new task
                const response = await fetch(`${API_URL}/tasks`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.token}`
                    },
                    body: JSON.stringify({
                        text,
                        emoji: this.taskEmoji.value.trim() || '📝',
                        status: this.currentStatus,
                        group: groupValue
                    })
                });

                if (response.ok) {
                    this.loadTasks();
                } else {
                    alert('Failed to create task');
                }
            }

            this.closeModal();
        } catch (err) {
            console.error('Error saving task:', err);
            alert('Error saving task');
        }
    }

    // Delete a task
    async deleteTask(id) {
        if (confirm('Delete this task?')) {
            try {
                const response = await fetch(`${API_URL}/tasks/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${this.token}` }
                });

                if (response.ok) {
                    this.loadTasks();
                } else {
                    alert('Failed to delete task');
                }
            } catch (err) {
                console.error('Error deleting task:', err);
                alert('Error deleting task');
            }
        }
    }

    // Move task to different status
    async moveTask(id, newStatus) {
        const task = this.tasks.find(t => t._id === id);
        if (task) {
            try {
                const response = await fetch(`${API_URL}/tasks/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.token}`
                    },
                    body: JSON.stringify({ status: newStatus })
                });

                if (response.ok) {
                    this.loadTasks();
                }
            } catch (err) {
                console.error('Error moving task:', err);
            }
        }
    }

    // Close modal
    closeModal() {
        this.modal.classList.remove('active');
        this.editingTaskId = null;
        this.hideNewGroupInput();
    }

    // Drag start handler
    dragStart(event) {
        const taskId = event.target.closest('.task-card')?.dataset.taskId;
        if (taskId) {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('taskId', taskId);
            event.target.closest('.task-card').style.opacity = '0.5';
        }
    }

    // Drag over handler
    dragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }

    // Drop handler
    drop(event, status) {
        event.preventDefault();
        const taskId = event.dataTransfer.getData('taskId');
        if (taskId) {
            this.moveTask(taskId, status);
        }
    }

    // Drag end handler
    dragEnd(event) {
        event.target.style.opacity = '1';
    }

    // Render a single card
    renderCard(task) {
        const otherStatuses = ['not-started', 'in-progress', 'done'].filter(s => s !== task.status);

        return `
            <div class="task-card" draggable="true" data-task-id="${task._id}" ondragstart="app.dragStart(event)" ondragend="app.dragEnd(event)" ondblclick="app.editTask('${task._id}')">
                <span class="task-emoji">${this.escapeHtml(task.emoji)}</span>
                <span class="task-text">${this.escapeHtml(task.text)}</span>
                <div class="task-actions">
                    <button class="action-btn move-${otherStatuses[0]}" onclick="app.moveTask('${task._id}', '${otherStatuses[0]}')" title="Move to ${otherStatuses[0].replace('-', ' ')}"></button>
                    <button class="action-btn move-${otherStatuses[1]}" onclick="app.moveTask('${task._id}', '${otherStatuses[1]}')" title="Move to ${otherStatuses[1].replace('-', ' ')}"></button>
                    <button class="action-btn delete-btn" onclick="app.deleteTask('${task._id}')" title="Delete"></button>
                </div>
            </div>
        `;
    }

    // Escape HTML special characters
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text ?? '';
        return div.innerHTML;
    }

    // Update counts
    updateCounts() {
        const notStartedCount = this.tasks.filter(t => t.status === 'not-started').length;
        const inProgressCount = this.tasks.filter(t => t.status === 'in-progress').length;
        const doneCount = this.tasks.filter(t => t.status === 'done').length;

        document.getElementById('notStartedCount').textContent = notStartedCount.toString();
        document.getElementById('inProgressCount').textContent = inProgressCount.toString();
        document.getElementById('doneCount').textContent = doneCount.toString();
    }

    // Render all cards
    render() {
        const statuses = ['not-started', 'in-progress', 'done'];
        const statusNames = { 'not-started': 'notStarted', 'in-progress': 'inProgress', 'done': 'done' };

        statuses.forEach(status => {
            const container = document.getElementById(`${statusNames[status]}Cards`);
            if (!container) return;

            let html = '';

            // Ungrouped tasks
            const ungroupedTasks = this.tasks.filter(t => t.status === status && !t.group);
            if (ungroupedTasks.length > 0) {
                ungroupedTasks.forEach(task => {
                    html += this.renderCard(task);
                });
            }

            // Grouped tasks
            this.groups.forEach(groupName => {
                const groupTasks = this.tasks.filter(t => t.status === status && t.group === groupName);
                if (groupTasks.length > 0) {
                    html += `
                        <div class="task-group">
                            <div class="group-header">
                                <span class="group-name">${this.escapeHtml(groupName)}</span>
                            </div>
                            <div class="group-tasks">
                                ${groupTasks.map(task => this.renderCard(task)).join('')}
                            </div>
                        </div>
                    `;
                }
            });

            container.innerHTML = html;
            container.addEventListener('dragover', (e) => this.dragOver(e));
            container.addEventListener('drop', (e) => this.drop(e, status));
        });

        this.updateCounts();
    }
}

// Logout function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    }
}

// Initialize the app when DOM is ready
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new TodoApp();

    if (!app.token) return; // Exit if no token

    // Close modal on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            app.closeModal();
        }
    });

    // Close modal when clicking outside
    document.getElementById('taskModal')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('taskModal')) {
            app.closeModal();
        }
    });

    // Submit on Enter key
    document.getElementById('taskInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            app.saveTask();
        }
    });

    // Add event listeners for "New task" buttons
    document.querySelectorAll('.new-page-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const status = btn.getAttribute('data-status');
            app.addNewTask(status);
        });
    });

    // Add event listeners for modal buttons
    document.getElementById('saveTaskBtn')?.addEventListener('click', () => {
        app.saveTask();
    });

    document.getElementById('cancelTaskBtn')?.addEventListener('click', () => {
        app.closeModal();
    });

    document.getElementById('newGroupBtn')?.addEventListener('click', () => {
        app.showNewGroupInput();
    });

    document.getElementById('createGroupBtn')?.addEventListener('click', () => {
        app.createNewGroup();
    });

    document.getElementById('cancelGroupBtn')?.addEventListener('click', () => {
        app.hideNewGroupInput();
    });
});

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

// ==================== WORKFLOW FUNCTIONALITY ====================

TodoApp.prototype.initializeWorkflowEventListeners = function() {
    // Workflow toolbar buttons
    const addWorkflowTaskBtn = document.getElementById('addWorkflowTaskBtn');
    const toggleConnectionModeBtn = document.getElementById('toggleConnectionModeBtn');
    const clearConnectionsBtn = document.getElementById('clearConnectionsBtn');
    
    addWorkflowTaskBtn?.addEventListener('click', () => this.openWorkflowTaskModal());
    toggleConnectionModeBtn?.addEventListener('click', () => this.toggleConnectionMode());
    clearConnectionsBtn?.addEventListener('click', () => this.clearAllConnections());
    
    // Workflow task modal buttons
    const saveWorkflowTaskBtn = document.getElementById('saveWorkflowTaskBtn');
    const cancelWorkflowTaskBtn = document.getElementById('cancelWorkflowTaskBtn');
    
    saveWorkflowTaskBtn?.addEventListener('click', () => this.saveWorkflowTask());
    cancelWorkflowTaskBtn?.addEventListener('click', () => this.closeWorkflowTaskModal());
};

TodoApp.prototype.switchView = function(view) {
    this.currentView = view;
    const boardView = document.getElementById('boardView');
    const workflowView = document.getElementById('workflowView');
    const boardViewBtn = document.getElementById('boardViewBtn');
    const workflowViewBtn = document.getElementById('workflowViewBtn');
    
    if (view === 'board') {
        boardView.style.display = 'flex';
        workflowView.style.display = 'none';
        boardViewBtn.classList.add('active');
        workflowViewBtn.classList.remove('active');
    } else {
        boardView.style.display = 'none';
        workflowView.style.display = 'block';
        boardViewBtn.classList.remove('active');
        workflowViewBtn.classList.add('active');
        this.renderWorkflowCanvas();
    }
};

TodoApp.prototype.openWorkflowTaskModal = function(taskId = null) {
    const modal = document.getElementById('workflowTaskModal');
    const modalTitle = document.getElementById('workflowModalTitle');
    const taskInput = document.getElementById('workflowTaskInput');
    const taskEmoji = document.getElementById('workflowTaskEmoji');
    const taskDescription = document.getElementById('workflowTaskDescription');
    
    if (taskId) {
        const task = this.workflowTasks.find(t => t.id === taskId);
        if (task) {
            this.editingWorkflowTaskId = taskId;
            modalTitle.textContent = 'Edit Workflow Task';
            taskInput.value = task.title;
            taskEmoji.value = task.emoji || '';
            taskDescription.value = task.description || '';
        }
    } else {
        this.editingWorkflowTaskId = null;
        modalTitle.textContent = 'Add Workflow Task';
        taskInput.value = '';
        taskEmoji.value = '';
        taskDescription.value = '';
    }
    
    modal.classList.add('active');
    taskInput.focus();
};

TodoApp.prototype.closeWorkflowTaskModal = function() {
    const modal = document.getElementById('workflowTaskModal');
    modal.classList.remove('active');
    this.editingWorkflowTaskId = null;
};

TodoApp.prototype.saveWorkflowTask = function() {
    const taskInput = document.getElementById('workflowTaskInput');
    const taskEmoji = document.getElementById('workflowTaskEmoji');
    const taskDescription = document.getElementById('workflowTaskDescription');
    
    const title = taskInput.value.trim();
    if (!title) {
        alert('Please enter a task name!');
        return;
    }
    
    if (this.editingWorkflowTaskId) {
        // Edit existing task
        const task = this.workflowTasks.find(t => t.id === this.editingWorkflowTaskId);
        if (task) {
            task.title = title;
            task.emoji = taskEmoji.value.trim();
            task.description = taskDescription.value.trim();
        }
    } else {
        // Create new task
        const newTask = {
            id: Date.now().toString(),
            title: title,
            emoji: taskEmoji.value.trim(),
            description: taskDescription.value.trim(),
            x: 100 + Math.random() * 200,
            y: 100 + Math.random() * 200
        };
        this.workflowTasks.push(newTask);
    }
    
    this.saveWorkflowToStorage();
    this.closeWorkflowTaskModal();
    this.renderWorkflowCanvas();
};

TodoApp.prototype.deleteWorkflowTask = function(taskId) {
    if (confirm('Delete this workflow task?')) {
        this.workflowTasks = this.workflowTasks.filter(t => t.id !== taskId);
        // Remove connections involving this task
        this.connections = this.connections.filter(c => 
            c.from !== taskId && c.to !== taskId
        );
        this.saveWorkflowToStorage();
        this.renderWorkflowCanvas();
    }
};

TodoApp.prototype.toggleConnectionMode = function() {
    this.connectionMode = !this.connectionMode;
    const btn = document.getElementById('toggleConnectionModeBtn');
    const canvasGrid = document.getElementById('canvasGrid');
    
    if (this.connectionMode) {
        btn.classList.add('active');
        canvasGrid.classList.add('connecting');
        this.connectionSource = null;
    } else {
        btn.classList.remove('active');
        canvasGrid.classList.remove('connecting');
        this.connectionSource = null;
        this.renderWorkflowCanvas();
    }
};

TodoApp.prototype.handleTaskConnection = function(taskId) {
    if (!this.connectionMode) return;
    
    if (!this.connectionSource) {
        this.connectionSource = taskId;
        const task = document.querySelector(`[data-workflow-id="${taskId}"]`);
        task.classList.add('connecting-source');
    } else if (this.connectionSource !== taskId) {
        // Create connection
        const connection = {
            from: this.connectionSource,
            to: taskId
        };
        
        // Check if connection already exists
        const exists = this.connections.some(c => 
            c.from === connection.from && c.to === connection.to
        );
        
        if (!exists) {
            this.connections.push(connection);
            this.saveWorkflowToStorage();
        }
        
        this.connectionSource = null;
        this.renderWorkflowCanvas();
    }
};

TodoApp.prototype.clearAllConnections = function() {
    if (confirm('Clear all connections?')) {
        this.connections = [];
        this.saveWorkflowToStorage();
        this.renderWorkflowCanvas();
    }
};

TodoApp.prototype.renderWorkflowCanvas = function() {
    const canvasGrid = document.getElementById('canvasGrid');
    const svg = document.getElementById('connectionsSvg');
    
    // Clear canvas
    canvasGrid.innerHTML = '';
    svg.innerHTML = '';
    
    // Render tasks
    this.workflowTasks.forEach(task => {
        const taskEl = document.createElement('div');
        taskEl.className = 'workflow-task';
        taskEl.setAttribute('data-workflow-id', task.id);
        taskEl.style.left = task.x + 'px';
        taskEl.style.top = task.y + 'px';
        
        const isSource = this.connectionMode && this.connectionSource === task.id;
        if (isSource) {
            taskEl.classList.add('connecting-source');
        }
        
        taskEl.innerHTML = `
            <div class="workflow-task-actions">
                <button class="workflow-task-btn edit" onclick="app.openWorkflowTaskModal('${task.id}')">✎</button>
                <button class="workflow-task-btn delete" onclick="app.deleteWorkflowTask('${task.id}')">✕</button>
            </div>
            <div class="workflow-task-header">
                <div class="workflow-task-title">
                    ${task.emoji ? `<span class="workflow-task-emoji">${task.emoji}</span>` : ''}
                    <span>${task.title}</span>
                </div>
            </div>
            ${task.description ? `<div class="workflow-task-description">${task.description}</div>` : ''}
            <div class="workflow-task-connection-point left" data-direction="left"></div>
            <div class="workflow-task-connection-point right" data-direction="right"></div>
            <div class="workflow-task-connection-point top" data-direction="top"></div>
            <div class="workflow-task-connection-point bottom" data-direction="bottom"></div>
        `;
        
        // Make task draggable
        this.makeTaskDraggable(taskEl, task);
        
        // Add click handler for connection mode
        taskEl.addEventListener('click', (e) => {
            if (this.connectionMode && !e.target.closest('.workflow-task-btn')) {
                this.handleTaskConnection(task.id);
            }
        });
        
        canvasGrid.appendChild(taskEl);
    });
    
    // Render connections
    this.renderConnections();
};

TodoApp.prototype.makeTaskDraggable = function(taskEl, task) {
    let isDragging = false;
    let startX, startY, initialX, initialY;
    
    const onMouseDown = (e) => {
        if (e.target.closest('.workflow-task-btn') || 
            e.target.closest('.workflow-task-connection-point') ||
            this.connectionMode) {
            return;
        }
        
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        initialX = task.x;
        initialY = task.y;
        
        taskEl.classList.add('dragging');
        e.preventDefault();
    };
    
    const onMouseMove = (e) => {
        if (!isDragging) return;
        
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        task.x = Math.max(0, initialX + dx);
        task.y = Math.max(0, initialY + dy);
        
        taskEl.style.left = task.x + 'px';
        taskEl.style.top = task.y + 'px';
        
        this.renderConnections();
    };
    
    const onMouseUp = () => {
        if (isDragging) {
            isDragging = false;
            taskEl.classList.remove('dragging');
            this.saveWorkflowToStorage();
        }
    };
    
    taskEl.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
};

TodoApp.prototype.renderConnections = function() {
    const svg = document.getElementById('connectionsSvg');
    svg.innerHTML = '';
    
    // Create arrow marker
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', 'arrowhead');
    marker.setAttribute('markerWidth', '10');
    marker.setAttribute('markerHeight', '10');
    marker.setAttribute('refX', '9');
    marker.setAttribute('refY', '3');
    marker.setAttribute('orient', 'auto');
    
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', '0 0, 10 3, 0 6');
    polygon.classList.add('connection-arrow');
    
    marker.appendChild(polygon);
    defs.appendChild(marker);
    svg.appendChild(defs);
    
    this.connections.forEach(conn => {
        const fromTask = this.workflowTasks.find(t => t.id === conn.from);
        const toTask = this.workflowTasks.find(t => t.id === conn.to);
        
        if (!fromTask || !toTask) return;
        
        const fromEl = document.querySelector(`[data-workflow-id="${conn.from}"]`);
        const toEl = document.querySelector(`[data-workflow-id="${conn.to}"]`);
        
        if (!fromEl || !toEl) return;
        
        const fromRect = fromEl.getBoundingClientRect();
        const toRect = toEl.getBoundingClientRect();
        const canvasRect = svg.getBoundingClientRect();
        
        const x1 = fromRect.left + fromRect.width / 2 - canvasRect.left;
        const y1 = fromRect.top + fromRect.height / 2 - canvasRect.top;
        const x2 = toRect.left + toRect.width / 2 - canvasRect.left;
        const y2 = toRect.top + toRect.height / 2 - canvasRect.top;
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const midX = (x1 + x2) / 2;
        const d = `M ${x1} ${y1} Q ${midX} ${y1}, ${midX} ${(y1 + y2) / 2} T ${x2} ${y2}`;
        
        path.setAttribute('d', d);
        path.classList.add('connection-line');
        path.setAttribute('marker-end', 'url(#arrowhead)');
        
        svg.appendChild(path);
    });
};

TodoApp.prototype.saveWorkflowToStorage = function() {
    localStorage.setItem('workflowTasks', JSON.stringify(this.workflowTasks));
    localStorage.setItem('workflowConnections', JSON.stringify(this.connections));
};

TodoApp.prototype.loadWorkflowFromStorage = function() {
    this.workflowTasks = JSON.parse(localStorage.getItem('workflowTasks') || '[]');
    this.connections = JSON.parse(localStorage.getItem('workflowConnections') || '[]');
};

/*
