//////////////////////////////////////////////////////////////////////////////////////
//
//  Copyright (c) 2014-2015, Egret Technology Inc.
//  All rights reserved.
//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of the Egret nor the
//       names of its contributors may be used to endorse or promote products
//       derived from this software without specific prior written permission.
//
//  THIS SOFTWARE IS PROVIDED BY EGRET AND CONTRIBUTORS "AS IS" AND ANY EXPRESS
//  OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
//  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
//  IN NO EVENT SHALL EGRET AND CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
//  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
//  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;LOSS OF USE, DATA,
//  OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
//  LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
//  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
//  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
//////////////////////////////////////////////////////////////////////////////////////

module egret {

    /**
     * @classdesc 影片剪辑，可以通过影片剪辑播放序列帧动画。MovieClip 类从以下类继承而来：DisplayObject 和 EventDispatcher。不同于 DisplayObject 对象，MovieClip 对象拥有一个时间轴。
     * @link http://docs.egret-labs.org/post/manual/displaycon/movieclip.html  MovieClip序列帧动画
     */
    export class MovieClip extends DisplayObject {

        //Render Property
        $bitmapData:Texture = null;

        //Data Property
        $movieClipData:MovieClipData = null;

        private frames:any[] = null;
        $totalFrames:number = 0;
        public frameLabels:any[] = null;
        private frameIntervalTime:number = 0;
        $eventPool:string[] = null;

        //Animation Property
        $isPlaying:boolean = false;
        private isStopped:boolean = true;
        private playTimes:number = 0;

        $currentFrameNum:number = 0;
        $nextFrameNum:number = 0;

        private displayedKeyFrameNum:number = 0;

        private passedTime:number = 0;

        //Construct Function

        /**
         * 创建新的 MovieClip 实例。创建 MovieClip 之后，调用舞台上的显示对象容器的addElement方法。
         * @param movieClipData {movieClipData} 被引用的 movieClipData 对象
         */
        constructor(movieClipData?:MovieClipData) {
            super();
            this.$renderRegion = new sys.Region();

            this.setMovieClipData(movieClipData);
        }

        $init() {
            this.$reset();
            var movieClipData:MovieClipData = this.$movieClipData;
            if (movieClipData && movieClipData.$isDataValid()) {
                this.frames = movieClipData.frames;
                this.$totalFrames = movieClipData.numFrames;
                this.frameLabels = movieClipData.labels;
                this.frameIntervalTime = 1000 / movieClipData.frameRate;
                this._initFrame();
            }
        }

        $reset():void {
            this.frames = null;
            this.playTimes = 0;
            this.$isPlaying = false;
            this.setIsStopped(true);
            this.$currentFrameNum = 0;
            this.$nextFrameNum = 1;
            this.displayedKeyFrameNum = 0;
            this.passedTime = 0;
            this.$eventPool = [];
        }

        private _initFrame():void {
            if (this.$movieClipData.$isTextureValid()) {
                this.advanceFrame();
                this.constructFrame();
            }
        }


        /**
         * @private
         */
        $render(context:sys.RenderContext):void {
            var texture = this.$bitmapData;
            if (texture) {
                context.imageSmoothingEnabled = false;

                var offsetX:number = Math.round(texture._offsetX);
                var offsetY:number = Math.round(texture._offsetY);
                var bitmapWidth:number = texture._bitmapWidth || texture._textureWidth;
                var bitmapHeight:number = texture._bitmapHeight || texture._textureHeight;
                var destW:number = Math.round(bitmapWidth);
                var destH:number = Math.round(bitmapHeight);

                context.drawImage(texture._bitmapData, texture._bitmapX, texture._bitmapY,
                    bitmapWidth, bitmapHeight, offsetX, offsetY, destW, destH);
            }
        }

        /**
         * @private
         */
        $measureContentBounds(bounds:Rectangle):void {
            var texture = this.$bitmapData;
            if (texture) {
                var x:number = texture._offsetX;
                var y:number = texture._offsetY;
                var w:number = texture._textureWidth;
                var h:number = texture._textureHeight;

                bounds.setTo(x, y, w, h);
            }
            else {
                bounds.setEmpty();
            }
        }

        $onAddToStage(stage:Stage, nestLevel:number):void {
            super.$onAddToStage(stage, nestLevel);

            if (this.$isPlaying && this.$totalFrames > 1) {
                this.setIsStopped(false);
            }
        }

        $onRemoveFromStage():void {
            super.$onRemoveFromStage();
            this.setIsStopped(true);
        }

        //Data Function
        /**
         * 返回帧标签为指定字符串的FrameLabel对象
         * @param labelName {string} 帧标签名
         * @param ignoreCase {boolean} 是否忽略大小写，可选参数，默认false
         * @returns {egret.FrameLabel} FrameLabel对象
         */
        private getFrameLabelByName(labelName:string, ignoreCase:boolean = false):FrameLabel {
            if (ignoreCase) {
                labelName = labelName.toLowerCase();
            }
            var frameLabels = this.frameLabels;
            if (frameLabels) {
                var outputFramelabel:FrameLabel = null;
                for (var i = 0; i < frameLabels.length; i++) {
                    outputFramelabel = frameLabels[i];
                    if (ignoreCase ? outputFramelabel.name.toLowerCase() == labelName : outputFramelabel.name == labelName) {
                        return outputFramelabel;
                    }
                }
            }
            return null;
        }

        /**
         * 返回指定序号的帧的FrameLabel对象
         * @param frame {number} 帧序号
         * @returns {egret.FrameLabel} FrameLabel对象
         */
        private getFrameLabelByFrame(frame:number):FrameLabel {
            var frameLabels = this.frameLabels;
            if (frameLabels) {
                var outputFramelabel:FrameLabel = null;
                for (var i = 0; i < frameLabels.length; i++) {
                    outputFramelabel = frameLabels[i];
                    if (outputFramelabel.frame == frame) {
                        return outputFramelabel;
                    }
                }
            }
            return null;
        }

        /**
         * 返回指定序号的帧对应的FrameLabel对象，如果当前帧没有标签，则返回前面最近的有标签的帧的FrameLabel对象
         * @method egret.MovieClip#getFrameLabelForFrame
         * @param frame {number} 帧序号
         * @returns {egret.FrameLabel} FrameLabel对象
         */
        private getFrameLabelForFrame(frame:number):FrameLabel {
            var outputFrameLabel:FrameLabel = null;
            var tempFrameLabel:FrameLabel = null;
            var frameLabels = this.frameLabels;
            if (frameLabels) {
                for (var i = 0; i < frameLabels.length; i++) {
                    tempFrameLabel = frameLabels[i];
                    if (tempFrameLabel.frame > frame) {
                        return outputFrameLabel;
                    }
                    outputFrameLabel = tempFrameLabel;
                }
            }
            return outputFrameLabel;
        }

        //Animation Function

        /**
         * 继续播放当前动画
         * @param playTimes {number} 播放次数。 参数为整数，可选参数，>=1：设定播放次数，<0：循环播放，默认值 0：不改变播放次数(MovieClip初始播放次数设置为1)，
         */
        public play(playTimes:number = 0):void {
            this.$isPlaying = true;
            this.setPlayTimes(playTimes);
            if (this.$totalFrames > 1 && this.$stage) {
                this.setIsStopped(false);
            }
        }

        /**
         * 暂停播放动画
         */
        public stop():void {
            this.$isPlaying = false;
            this.setIsStopped(true);
        }

        /**
         * 将播放头移到前一帧并停止
         */
        public prevFrame():void {
            this.gotoAndStop(this.$currentFrameNum - 1);
        }

        /**
         * 跳到后一帧并停止
         */
        public nextFrame():void {
            this.gotoAndStop(this.$currentFrameNum + 1);
        }

        /**
         * 将播放头移到指定帧并播放
         * @param frame {any} 指定帧的帧号或帧标签
         * @param playTimes {number} 播放次数。 参数为整数，可选参数，>=1：设定播放次数，<0：循环播放，默认值 0：不改变播放次数，
         */
        public gotoAndPlay(frame:any, playTimes:number = 0):void {
            if (arguments.length == 0 || arguments.length > 2) {
                throw new Error(getString(1022, "MovieClip.gotoAndPlay()"));
            }
            this.play(playTimes);
            this.gotoFrame(frame);
        }

        /**
         * 将播放头移到指定帧并停止
         * @param frame {any} 指定帧的帧号或帧标签
         */
        public gotoAndStop(frame:any):void {
            if (arguments.length != 1) {
                throw new Error(getString(1022, "MovieClip.gotoAndStop()"));
            }
            this.stop();
            this.gotoFrame(frame);
        }

        private gotoFrame(frame:any):void {
            var frameNum:number;
            if (typeof frame === "string") {
                frameNum = this.getFrameLabelByName(frame).frame;
            } else {
                frameNum = parseInt(frame + '', 10);
                if (<any>frameNum != frame) {
                    throw new Error(getString(1022, "Frame Label Not Found"));
                }
            }

            if (frameNum < 1) {
                frameNum = 1;
            } else if (frameNum > this.$totalFrames) {
                frameNum = this.$totalFrames;
            }
            if (frameNum == this.$nextFrameNum) {
                return;
            }

            this.$nextFrameNum = frameNum;
            this.advanceFrame();
            this.constructFrame();
            this.handlePendingEvent();
        }

        private lastTime:number = 0;

        private advanceTime(advancedTime:number):boolean {
            var self = this;
            var frameIntervalTime:number = self.frameIntervalTime;
            var currentTime = self.passedTime + advancedTime;
            self.passedTime = currentTime % frameIntervalTime;

            var num:number = currentTime / frameIntervalTime;
            if (num < 1) {
                return false;
            }
            while (num >= 1) {
                num--;
                self.$nextFrameNum++;
                if (self.$nextFrameNum > self.$totalFrames) {
                    if (self.playTimes == -1) {
                        self.$eventPool.push(Event.LOOP_COMPLETE);
                        self.$nextFrameNum = 1;
                    }
                    else {
                        self.playTimes--;
                        if (self.playTimes > 0) {
                            self.$eventPool.push(Event.LOOP_COMPLETE);
                            self.$nextFrameNum = 1;
                        }
                        else {
                            self.$nextFrameNum = self.$totalFrames;
                            self.$eventPool.push(Event.COMPLETE);
                            self.stop();
                            break;
                        }
                    }
                }
                self.advanceFrame();
            }
            self.constructFrame();
            self.handlePendingEvent();

            return true;
        }

        private advanceFrame():void {
            this.$currentFrameNum = this.$nextFrameNum;
        }

        private constructFrame() {
            var currentFrameNum:number = this.$currentFrameNum;
            if (this.displayedKeyFrameNum == currentFrameNum) {
                return;
            }
            this.$bitmapData = this.$movieClipData.getTextureByFrame(currentFrameNum);

            this.$invalidateContentBounds();

            this.displayedKeyFrameNum = currentFrameNum;
        }

        private handlePendingEvent():void {
            if (this.$eventPool.length != 0) {
                this.$eventPool.reverse();
                var eventPool:any[] = this.$eventPool;
                var length:number = eventPool.length;
                var isComplete:boolean = false;
                var isLoopComplete:boolean = false;

                for (var i = 0; i < length; i++) {
                    var event:string = eventPool.pop();
                    if (event == Event.LOOP_COMPLETE) {
                        isLoopComplete = true;
                    } else if (event == Event.COMPLETE) {
                        isComplete = true;
                    } else {
                        this.dispatchEventWith(event);
                    }
                }

                if (isLoopComplete) {
                    this.dispatchEventWith(Event.LOOP_COMPLETE);
                }
                if (isComplete) {
                    this.dispatchEventWith(Event.COMPLETE);
                }
            }
        }

        //Properties
        /**
         * MovieClip 实例中帧的总数
         */
        public get totalFrames():number {
            return this.$totalFrames;
        }

        /**
         * MovieClip 实例当前播放的帧的序号
         */
        public get currentFrame():number {
            return this.$currentFrameNum;
        }

        /**
         * MovieClip 实例当前播放的帧的标签。如果当前帧没有标签，则 currentFrameLabel返回null。
         */
        public get currentFrameLabel():string {
            var label = this.getFrameLabelByFrame(this.$currentFrameNum);
            return label && label.name;
        }

        /**
         * 当前播放的帧对应的标签，如果当前帧没有标签，则currentLabel返回包含标签的先前帧的标签。如果当前帧和先前帧都不包含标签，currentLabel返回null。
         */
        public get currentLabel():string {
            var label:FrameLabel = this.getFrameLabelForFrame(this.$currentFrameNum);
            return label ? label.name : null;
        }

        /**
         * MovieClip 实例的帧频
         */
        public get frameRate():number {
            return this.$movieClipData.frameRate;
        }

        public set frameRate(value:number) {
            if (value == this.$movieClipData.frameRate) {
                return;
            }
            this.$movieClipData.frameRate = value;
            this.frameIntervalTime = 1000 / this.$movieClipData.frameRate;
        }

        /**
         * MovieClip 实例当前是否正在播放
         */
        public get isPlaying():boolean {
            return this.$isPlaying;
        }

        /**
         * MovieClip数据源
         */
        public set movieClipData(value:MovieClipData) {
            this.setMovieClipData(value);
        }

        public get movieClipData():MovieClipData {
            return this.$movieClipData;
        }

        private setMovieClipData(value:MovieClipData) {
            if (this.$movieClipData == value) {
                return;
            }
            this.$movieClipData = value;
            this.$init();
        }

        private setPlayTimes(value:number) {
            if (value < 0 || value >= 1) {
                this.playTimes = value < 0 ? -1 : Math.floor(value);
            }
        }

        private setIsStopped(value:boolean) {
            if (this.isStopped == value) {
                return;
            }
            this.isStopped = value;
            if (value) {
                this.playTimes = 0;

                stopTick(this.advanceTime, this);
            } else {
                this.playTimes = this.playTimes == 0 ? 1 : this.playTimes;
                startTick(this.advanceTime, this);
                this.lastTime = egret.getTimer();
            }
        }
    }
}
