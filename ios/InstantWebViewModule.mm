#import "InstantWebViewModule.h"
#import <React/RCTBridge.h>
#import <React/RCTUIManager.h>

@interface InstantWebViewModule ()
#ifdef RCT_NEW_ARCH_ENABLED
<NativeInstantWebViewSpec>
#endif
@end

@implementation InstantWebViewModule {
  NSMapTable<NSNumber *, UIView *> *_detachedViews;
}

RCT_EXPORT_MODULE(InstantWebView)

- (instancetype)init {
  self = [super init];
  if (self) {
    _detachedViews = [NSMapTable strongToStrongObjectsMapTable];
  }
  return self;
}

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

- (dispatch_queue_t)methodQueue {
  return dispatch_get_main_queue();
}

// Codegen expects `double` for number params.
// In Old Architecture, RCT_EXPORT_METHOD handles JS number → double conversion.
// In New Architecture, the generated JSI binding uses double directly.

RCT_EXPORT_METHOD(detachView:(double)tag) {
  NSNumber *viewTag = @((NSInteger)tag);
  RCTUIManager *uiManager = [self.bridge moduleForClass:[RCTUIManager class]];
  if (!uiManager) return;

  [uiManager addUIBlock:^(__unused RCTUIManager *manager,
                          NSDictionary<NSNumber *, UIView *> *viewRegistry) {
    UIView *view = viewRegistry[viewTag];
    if (view && view.superview) {
      [self->_detachedViews setObject:view forKey:viewTag];
      [view removeFromSuperview];
    }
  }];
}

RCT_EXPORT_METHOD(attachView:(double)tag parentTag:(double)parentTag) {
  NSNumber *viewTag = @((NSInteger)tag);
  NSNumber *parentViewTag = @((NSInteger)parentTag);
  RCTUIManager *uiManager = [self.bridge moduleForClass:[RCTUIManager class]];
  if (!uiManager) return;

  [uiManager addUIBlock:^(__unused RCTUIManager *manager,
                          NSDictionary<NSNumber *, UIView *> *viewRegistry) {
    UIView *view = [self->_detachedViews objectForKey:viewTag];
    UIView *parent = viewRegistry[parentViewTag];
    if (view && parent) {
      [parent addSubview:view];
      [self->_detachedViews removeObjectForKey:viewTag];
    }
  }];
}

#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeInstantWebViewSpecJSI>(params);
}
#endif

@end
