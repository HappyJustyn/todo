/**
 * 开头;是为了防止前面引入的js中，可能有的语句末尾未加;而引起的错误
 * 代码写在匿名函数中，是为了防止变量成为全局变量（污染window对象）
 */
;(function () {
    'use strict';

    // $开头的变量表示jQuery对象
    let $form_add_task = $('.add-task'),
        $window = $(window),
        $body = $('body'),
        task_list = [],
        $task_delete_trigger,
        $task_detail_trigger,
        $task_detail = $('.task-detail'),
        $task_detail_mask = $('.task-detail-mask'),
        // current_index,
        $update_form,
        $task_detail_content,
        $task_detail_content_input,
        $checkbox_complete,
        $msg = $('.msg'),
        $msg_content = $msg.find('.msg-content'),
        $msg_confirm = $msg.find('.confirmed'),
        $alerter = $('.alerter')
    ;

    init();

    $form_add_task.on('submit', on_add_task_form_submit);
    $task_detail_mask.on('click', hide_task_detail);

    /**
     * 自定义alert
     */
    function pop(arg) {
        if (!arg) {
            console.error('pop title is required');
        }
        let conf = {},
            $box,
            $mask,
            $title,
            $content,
            $confirm,
            $cancel,
            timer,
            dfd,
            confirmed
        ;
        if (typeof arg === 'string') {
            conf.title = arg;
        } else {
            conf = $.extend(conf, arg);
        }
        let box_tpl = `
            <div>
                <div class="pop-title">${conf.title}</div>
                <div class="pop-content">
                    <div>
                        <button style="margin-right: 5px" class="primary confirm">确定</button>
                        <button class="cancel">取消</button>
                    </div>
                </div>
            </div>
        `;
        $box = $(box_tpl).css({
            color: '#444',
            width: 300,
            height: 'auto',
            padding: '15px 10px',
            background: '#fff',
            position: 'fixed',
            borderRadius: 3,
            boxShadow: '0 1px 2px rgba(0,0,0,.5)'
        });
        $title = $box.find('.pop-title').css({
            padding: '5px 10px',
            'font-weight': 900,
            'font-size': 20,
            'text-align': 'center'
        });
        $content = $box.find('.pop-content').css({
            padding: '5px 10px',
            'text-align': 'center'
        });
        $confirm = $content.find('button.confirm');
        $cancel = $content.find('button.cancel');
        $mask = $('<div></div>').css({
            position: 'fixed',
            background: 'rgba(0,0,0,0.5)',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0
        });
        dfd = $.Deferred();
        timer = setInterval(function () {
            if (confirmed !== undefined) {
                // 传递confirmed
                dfd.resolve(confirmed);
                // 结束轮询
                clearInterval(timer);
                dismiss_pop();
            }
        }, 50);

        $confirm.on('click', on_confirmed);
        $cancel.on('click', on_cancel);
        $mask.on('click', on_cancel);

        function on_confirmed() {
            confirmed = true;
        }

        function on_cancel() {
            confirmed = false;
        }

        function dismiss_pop() {
            $mask.remove();
            $box.remove();
        }

        // 自定义alert居中
        function adjust_box_position() {
            let window_width = $window.width(),
                window_height = $window.height(),
                box_width = $box.width(),
                box_height = $box.height(),
                move_x,
                move_y;
            move_x = (window_width - box_width) / 2;
            move_y = ((window_height - box_height) / 2) - 20;
            $box.css({
                left: move_x,
                top: move_y
            });
        }

        $window.on('resize', function () {
            adjust_box_position();
        });

        $mask.appendTo($body);
        $box.appendTo($body);
        $window.resize();
        return dfd.promise();
    }

    /**
     * 监听提醒确认按钮
     */
    function listen_msg_event() {
        $msg_confirm.on('click', function () {
            hide_msg();
        });
    }

    function on_add_task_form_submit(e) {
        let new_task = {};
        // 禁用提交
        e.preventDefault();
        let $input = $(this).find('input[name=content]');
        new_task.content = $input.val();
        if (!new_task.content) return;
        // 存入新task
        if (add_task(new_task)) {
            $input.val('');
        }
    }

    /**
     * 监听task详情打开
     */
    function listen_task_detail() {
        let index;
        $('.task-item').on('dblclick', function () {
            index = $(this).data('index');
            show_task_detail(index);
        });
        $task_detail_trigger.on('click', function () {
            let $this = $(this);
            let $item = $this.parent().parent();
            index = $item.data('index');
            show_task_detail(index);
        });
    }

    /**
     * 监听复选框
     */
    function listen_checkbox_complete() {
        $checkbox_complete.on('click', function () {
            let $this = $(this);
            let is_complete = $this.prop('checked');
            let index = $this.parent().parent().data('index');
            update_task(index, {complete: is_complete});
        });
    }

    function get(index) {
        return store.get('task_list')[index];
    }

    /**
     * 显示task详情
     */
    function show_task_detail(index) {
        render_task_detail(index);
        // current_index = index;
        $task_detail.show();
        $task_detail_mask.show();
    }

    /**
     * 更新task详情
     */
    function update_task(index, data) {
        if (index === undefined || !task_list[index]) return;
        task_list[index] = $.extend(task_list[index], data);
        refresh_task_list();
    }

    function hide_task_detail() {
        $task_detail.hide();
        $task_detail_mask.hide();
    }

    function render_task_detail(index) {
        if (index === undefined || !task_list[index]) return;
        let item = task_list[index];
        let tpl =
            `<form>
                <div class="content">
                    ${item.content}
                </div>
                <div class="input-item">
                    <input style="display: none" type="text" name="content" value="${item.content}">
                </div>
                <div>
                    <div class="desc input-item">
                        <textarea name="desc">${item.desc || ''}</textarea>
                    </div>
                </div>
                <div class="remind input-item">
                    <label>提醒时间</label>
                    <input class="datetime" name="remind_date" type="text" value="${item.remind_date || ''}" autocomplete="off">
                </div>
                <div class="input-item">
                    <button type="submit"> 更新 </button>
                </div>
            </form>`;
        $task_detail.empty();
        $task_detail.html(tpl);
        $('.datetime').datetimepicker();
        $update_form = $task_detail.find('form');
        $task_detail_content = $update_form.find('.content');
        $task_detail_content_input = $update_form.find('[name=content]');
        $task_detail_content.on('dblclick', function () {
            $task_detail_content.hide();
            $task_detail_content_input.show();
        });
        $update_form.on('submit', function (e) {
            e.preventDefault();
            let data = {};
            data.content = $(this).find('[name=content]').val();
            data.desc = $(this).find('[name=desc]').val();
            data.remind_date = $(this).find('[name=remind_date]').val();
            update_task(index, data);
            hide_task_detail();
        });
    }

    /**
     * 监听删除事件
     */
    function listen_task_delete() {
        $task_delete_trigger.on('click', function () {
            let $this = $(this);
            let $item = $this.parent().parent();
            let index = $item.data('index');
            // if (confirm('确定删除？')) delete_task(index);
            pop('确定删除？').then(function (r) {
                if (r) delete_task(index);
            });
        });
    }

    function add_task(new_task) {
        // 新task插入到数组前面
        task_list.unshift(new_task);
        refresh_task_list();
        return true;
    }

    /**
     * 更新localStorage，且重新渲染task列表
     */
    function refresh_task_list() {
        // 更新localStorage
        store.set('task_list', task_list);
        render_task_list();
    }

    function delete_task(index) {
        if (index === undefined || !task_list[index]) return;
        task_list.splice(index, 1);
        refresh_task_list();
    }

    function init() {
        // store.clear();
        task_list = store.get('task_list') || [];
        listen_msg_event();
        if (task_list.length) {
            render_task_list();
        }
        task_remind_check();
    }

    /**
     * 检查task的提醒时间
     */
    function task_remind_check() {
        // show_msg('test');
        let current_timestamp;
        let itl = setInterval(function () {
            for (let i = 0; i < task_list.length; i++) {
                let item = task_list[i], task_timestamp;
                if (!item || !item.remind_date || item.informed) continue;
                current_timestamp = new Date().getTime();
                task_timestamp = new Date(item.remind_date).getTime();
                if (current_timestamp - task_timestamp >= 1) {
                    // 更新提醒状态
                    update_task(i, {informed: true});
                    show_msg(item.content);
                }
            }
        }, 300);
    }

    /**
     * 显示提醒内容
     */
    function show_msg(msg) {
        if (!msg) return;
        $msg_content.html(msg);
        // 提示音
        $alerter.get(0).play();
        $msg.show();
    }

    function hide_msg() {
        $msg.hide();
    }

    /**
     * 渲染task列表
     */
    function render_task_list() {
        let $task_list = $('.task-list');
        // 渲染之前清空列表
        $task_list.empty();
        let complete_items = [];
        // 渲染未完成的task
        for (let i = 0; i < task_list.length; i++) {
            let item = task_list[i];
            // 区分已完成的task
            if (item && item.complete) {
                complete_items[i] = item;
            } else {
                let $task = render_task_item(task_list[i], i);
                $task_list.append($task);
            }
        }
        // 渲染已完成的task
        for (let i = 0; i < complete_items.length; i++) {
            let $task = render_task_item(complete_items[i], i);
            // 跳过数组中的undefined
            if (!$task) continue;
            // 给已完成的task添加样式
            $task.addClass('completed');
            $task_list.append($task);
        }
        // 文档渲染完成之后，再获取元素
        $task_delete_trigger = $('.action.delete');
        $task_detail_trigger = $('.action.detail');
        $checkbox_complete = $('.task-list .complete[type=checkbox]');
        listen_task_delete();
        listen_task_detail();
        listen_checkbox_complete();
    }

    function render_task_item(data, index) {
        if (data === undefined || index === undefined) return;
        // 新task模板
        let list_item_tpl =
            // data-index 自定义属性，为了传递index
            // 由于模板字符串的大括号内部，就是执行JavaScript代码，因此如果大括号内部是一个字符串，将会原样输出。
            `<div class="task-item" data-index="${index}">
                <span><input class="complete" type="checkbox" ${data.complete ? 'checked' : ''}></span>
                <span class="task-content">${data.content}</span>
                <span class="fr">
                    <span class="action delete"> 删除 </span>
                    <span class="action detail"> 详细 </span>
                </span>
            </div>`;
        return $(list_item_tpl);
    }

})();

