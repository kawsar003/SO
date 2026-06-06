import React, { useState, useEffect } from 'react';
import { Plus, CheckSquare, Clock, X } from 'lucide-react';

export function Tasks() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    project: '',
    assignee: '',
    dueDate: '',
    status: 'To Do'
  });

  const fetchTasks = async () => {
    try {
      const res = await fetch('/management/api/tasks');
      const data = await res.json();
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/management/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsModalOpen(false);
        setFormData({
          title: '',
          project: '',
          assignee: '',
          dueDate: '',
          status: 'To Do'
        });
        fetchTasks();
      }
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tasks & Projects</h1>
          <p className="text-sm text-slate-500 mt-1">Manage project assignments, deadlines, and kanban boards.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" /> New Task
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {['To Do', 'In Progress', 'Completed'].map(status => (
          <div key={status} className="bg-slate-100 rounded-xl p-4 flex flex-col gap-4">
            <h3 className="font-bold text-slate-700 text-sm">{status}</h3>
            <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
              {tasks.filter(t => t.status === status).map(task => (
                <div key={task.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-bold text-slate-900 text-sm leading-tight">{task.title}</h4>
                    <CheckSquare className={`w-4 h-4 ${status === 'Completed' ? 'text-emerald-500' : 'text-slate-300'}`} />
                  </div>
                  <div className="text-xs font-semibold text-blue-600 mb-3">{task.project}</div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                    <div className="flex items-center">
                      <div className="w-5 h-5 rounded-full bg-slate-200 border border-white flex items-center justify-center text-slate-700 font-bold mr-2">
                        {task.assignee ? task.assignee.charAt(0) : '?'}
                      </div>
                      {task.assignee}
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {task.dueDate}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Create New Task</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Task Title</label>
                <input 
                  required
                  type="text" 
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="What needs to be done?"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Project</label>
                <input 
                  required
                  type="text" 
                  value={formData.project}
                  onChange={e => setFormData({...formData, project: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="e.g. Finance, IT, Marketing"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Assignee</label>
                  <input 
                    required
                    type="text" 
                    value={formData.assignee}
                    onChange={e => setFormData({...formData, assignee: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Due Date</label>
                  <input 
                    required
                    type="date" 
                    value={formData.dueDate}
                    onChange={e => setFormData({...formData, dueDate: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Status</label>
                <select 
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="To Do">To Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
