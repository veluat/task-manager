import { createSlice } from "@reduxjs/toolkit";
import {createAppAsyncThunk} from "../../../../common/utils";
import {
    AddTaskArgType,
    RemoveTaskArgType,
    TaskType,
    UpdateTaskArgType,
    UpdateTaskModelType
} from "../api/tasks.api.types";
import {tasksApi} from "../api/tasks.api";
import {ResultCode} from "../../../../common/enums";
import {appActions} from "../../../../app/app.slice";
import {todolistsThunks} from "../../todolists/model/todolists.slice";
import {clearTasksAndTodolists} from "../../../../common/actions";


const fetchTasks = createAppAsyncThunk<
  { tasks: TaskType[]; todolistId: string },
  string
>("tasks/fetchTasks", async (todolistId) => {
  const res = await tasksApi.getTasks(todolistId);
  const tasks = res.data.items;
  return { tasks, todolistId };
});

const addTask = createAppAsyncThunk<{ task: TaskType }, AddTaskArgType>(
  "tasks/addTask",
  async (arg, thunkAPI) => {
    const { rejectWithValue } = thunkAPI;
    const res = await tasksApi.createTask(arg);
    if (res.data.resultCode === ResultCode.Success) {
      const task = res.data.data.item;
      return { task };
    } else {
      return rejectWithValue({ data: res.data, showGlobalError: false });
    }
  }
);

const updateTask = createAppAsyncThunk<UpdateTaskArgType, UpdateTaskArgType>(
  "tasks/updateTask",
  async (arg, thunkAPI) => {
    const { dispatch, rejectWithValue, getState } = thunkAPI;

    const state = getState();
    const task = state.tasks[arg.todolistId].find((t) => t.id === arg.taskId);
    if (!task) {
      dispatch(
        appActions.setAppError({ error: "Task not found in the state" })
      );
      return rejectWithValue(null);
    }

    const apiModel: UpdateTaskModelType = {
      deadline: task.deadline,
      description: task.description,
      priority: task.priority,
      startDate: task.startDate,
      title: task.title,
      status: task.status,
      ...arg.domainModel,
    };

    const res = await tasksApi.updateTask(arg.todolistId, arg.taskId, apiModel);
    if (res.data.resultCode === ResultCode.Success) {
      return arg;
    } else {
      return rejectWithValue({ data: res.data, showGlobalError: true });
    }
  }
);

const removeTask = createAppAsyncThunk<RemoveTaskArgType, RemoveTaskArgType>(
  "tasks/removeTask",
  async (arg, thunkAPI) => {
    const { rejectWithValue } = thunkAPI;

    const res = await tasksApi.deleteTask(arg);
    if (res.data.resultCode === ResultCode.Success) {
      return arg;
    } else {
      return rejectWithValue({ data: res.data, showGlobalError: true });
    }
  }
);

const initialState: TasksStateType = {};

const slice = createSlice({
  name: "tasks",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state[action.payload.todolistId] = action.payload.tasks;
      })
      .addCase(addTask.fulfilled, (state, action) => {
        const tasks = state[action.payload.task.todoListId];
        tasks.unshift(action.payload.task);
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        const tasks = state[action.payload.todolistId];
        const index = tasks.findIndex((t) => t.id === action.payload.taskId);
        if (index !== -1) {
          tasks[index] = { ...tasks[index], ...action.payload.domainModel };
        }
      })
      .addCase(removeTask.fulfilled, (state, action) => {
        const tasks = state[action.payload.todolistId];
        const index = tasks.findIndex((t) => t.id === action.payload.taskId);
        if (index !== -1) tasks.splice(index, 1);
      })
      .addCase(todolistsThunks.addTodolist.fulfilled, (state, action) => {
        state[action.payload.todolist.id] = [];
      })
      .addCase(todolistsThunks.removeTodolist.fulfilled, (state, action) => {
        delete state[action.payload.id];
      })
      .addCase(todolistsThunks.fetchTodolists.fulfilled, (state, action) => {
        action.payload.todolists.forEach((tl: { id: string | number; }) => {
          state[tl.id] = [];
        });
      })
      .addCase(clearTasksAndTodolists, () => {
        return {};
      });
  },
});

export const tasksSlice = slice.reducer;
export const tasksThunks = { fetchTasks, addTask, updateTask, removeTask };

export type TasksStateType = Record<string, TaskType[]>;
